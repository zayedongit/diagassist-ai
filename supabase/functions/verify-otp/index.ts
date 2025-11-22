import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Input validation schemas
const VerifyOTPSchema = z.object({
  phone_number: z.string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format')
    .min(10)
    .max(15),
  otp: z.string()
    .regex(/^\d{6}$/, 'OTP must be 6 digits')
    .length(6),
  user_type: z.enum(['patient', 'doctor']).optional(),
  first_name: z.string()
    .trim()
    .min(1, 'First name required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
    .optional(),
  last_name: z.string()
    .trim()
    .max(100, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
    .or(z.literal(''))
    .optional()
});

interface VerifyOTPRequest {
  phone_number: string;
  otp: string;
  user_type?: 'patient' | 'doctor';
  first_name?: string;
  last_name?: string;
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return 'XXX';
  return phone.slice(0, 3) + 'XXXXX' + phone.slice(-4);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate input with zod
    const validation = VerifyOTPSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input',
          details: validation.error.issues[0].message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone_number, otp, user_type = 'patient', first_name, last_name } = validation.data;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify OTP
    const { data: verification, error: verifyError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('verification_code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError || !verification) {
      // Secure logging: don't log full verification object
      console.log('OTP verification failed', { 
        phone: maskPhone(phone_number),
        errorCode: verifyError?.code
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid or expired OTP' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('sms_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    // Normalize phone number for search (both with and without +)
    const normalizedPhone = phone_number.replace('+', '');
    const phoneWithPlus = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
    const phoneWithoutPlus = phone_number.replace('+', '');
    
    // Secure logging: mask phone variations
    console.log('Searching for user', { 
      phone: maskPhone(phoneWithPlus)
    });

    // Search for existing user with all phone number variations
    let user = null;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    
    if (existingUsers?.users) {
      user = existingUsers.users.find(u => 
        u.phone === phoneWithPlus || 
        u.phone === phoneWithoutPlus ||
        u.user_metadata?.phone_number === phoneWithPlus ||
        u.user_metadata?.phone_number === phoneWithoutPlus
      );
    }

    // Generate a strong temporary password
    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(36))
      .join('');
    
    const tempEmail = `${normalizedPhone}@phone.auth`;

    if (!user) {
      console.log('No existing user found, creating new user');
      
      try {
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
          phone: phoneWithoutPlus, // Store without + to match Supabase format
          email: tempEmail,
          phone_confirm: true, // Correct flag for createUser
          email_confirm: true, // Correct flag for createUser
          password: tempPassword, // Set password during creation
          user_metadata: {
            user_type,
            first_name: first_name || 'User',
            last_name: last_name || '',
            phone_number: phoneWithPlus, // Store with + in metadata for consistency
            phone_verified: true
          }
        });
        
        console.log('Create user attempt result:', { createError, userId: userData?.user?.id });
        
        if (createError) {
          if (createError.message?.includes('Phone number already registered') || createError.code === 'phone_exists') {
            console.log('Phone already exists, searching again for user');
            // Phone exists but we couldn't find it in the first search, try again
            const { data: retryUsers } = await supabase.auth.admin.listUsers();
            user = retryUsers?.users?.find(u => 
              u.phone === phoneWithPlus || 
              u.phone === phoneWithoutPlus ||
              u.user_metadata?.phone_number === phoneWithPlus ||
              u.user_metadata?.phone_number === phoneWithoutPlus
            );
            
            if (!user) {
              throw new Error('User exists but could not be found');
            }
          } else {
            throw createError;
          }
        } else {
          user = userData.user;
        }
      } catch (error) {
        console.error('User creation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error('Failed to create or find user: ' + errorMessage);
      }
    }

    // Secure logging: don't log phone number
    console.log('Found/created user', { userId: user?.id });

    // Create/ensure profile exists for the user
    console.log('Creating/updating profile for user');
    try {
      // First try to check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create new profile
        console.log('Creating new profile for user:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            user_type: user_type,
            first_name: first_name || 'User',
            last_name: last_name || '',
            phone_number: phoneWithPlus,
            phone_verified: true,
            verified_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Profile creation error:', insertError);
        } else {
          console.log('Profile created successfully');
        }
      } else {
        // Update existing profile
        console.log('Updating existing profile for user:', user.id);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: first_name || 'User',
            last_name: last_name || '',
            phone_number: phoneWithPlus,
            phone_verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
        } else {
          console.log('Profile updated successfully');
        }
      }
    } catch (profileErr) {
      console.error('Profile handling error:', profileErr);
    }

    // Update user to ensure they're confirmed and set password
    console.log('Updating user for authentication:', user.id);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email: tempEmail,
      password: tempPassword,
      email_confirm: true,
      phone_confirm: true
    });
    
    if (updateError) {
      console.error('User update error:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to prepare user session'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Sign in with password to create a session
    console.log('Creating session for user:', user.id);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: tempEmail,
      password: tempPassword
    });
    
    if (signInError || !signInData?.session) {
      console.error('Sign in failed:', signInError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create session'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Secure logging: mask phone number
    console.log('OTP verified successfully', { 
      phone: maskPhone(phone_number),
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP verified successfully',
        user: signInData.user,
        session: signInData.session,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Verify OTP error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});