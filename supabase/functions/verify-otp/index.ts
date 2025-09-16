import { corsHeaders } from '../_shared/cors.ts';

interface VerifyOTPRequest {
  phone_number: string;
  otp: string;
  user_type?: 'patient' | 'doctor';
  first_name?: string;
  last_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, otp, user_type = 'patient', first_name, last_name }: VerifyOTPRequest = await req.json();
    
    if (!phone_number || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Verify OTP - change .single() to .maybeSingle() to avoid errors when no data is found
    const { data: verification, error: verifyError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('verification_code', otp)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError || !verification) {
      console.log('OTP verification failed:', verifyError, verification);
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

    // Mark OTP as used
    await supabase
      .from('sms_verifications')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verification.id);

    // Normalize phone number for search (both with and without +)
    const normalizedPhone = phone_number.replace('+', '');
    const phoneWithPlus = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
    const phoneWithoutPlus = phone_number.replace('+', '');

    console.log('Searching for user with phone variations:', { phoneWithPlus, phoneWithoutPlus });

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
        throw new Error('Failed to create or find user: ' + error.message);
      }
    }

    console.log('Found/created user:', user?.id, 'phone:', user?.phone);

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

    // Create a session directly using admin API to bypass confirmation issues
    console.log('Creating admin session for user:', user.id);
    
    let signInData;
    
    try {
      // First, update user to ensure they're confirmed
      const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        phone_confirm: true
      });
      
      if (confirmError) {
        console.error('Failed to confirm user:', confirmError);
      }

      // Generate a session link that creates a valid session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: tempEmail,
        options: {
          redirectTo: undefined // We don't need a redirect, just the tokens
        }
      });
      
      if (linkError) {
        console.error('Failed to generate session link:', linkError);
        throw linkError;
      }
      
      console.log('Generated session tokens successfully');
      
      // Extract tokens from the response
      const accessToken = linkData.properties?.access_token;
      const refreshToken = linkData.properties?.refresh_token;
      
      if (!accessToken || !refreshToken) {
        throw new Error('Failed to generate session tokens - missing tokens in response');
      }
      
      // Create session object
      const sessionData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: linkData.user
      };
      
      console.log('Session created successfully for user:', user.id);
      
      signInData = {
        user: linkData.user,
        session: sessionData
      };

    } catch (sessionError) {
      console.error('Session creation failed, falling back to password auth:', sessionError);
      
      // Fallback: Try to update user with confirmed flags and use password login
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email: tempEmail,
        password: tempPassword,
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: new Date().toISOString()
      });
      
      if (updateError) {
        console.error('User update error:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to create session: ' + updateError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Try email login as fallback
      const { data: fallbackData, error: fallbackError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword
      });
      
      if (fallbackError || !fallbackData?.session) {
        console.error('Fallback login failed:', fallbackError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to create session: ' + (fallbackError?.message || 'Session creation failed')
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      signInData = fallbackData;
    }

    console.log('OTP verified successfully for:', phone_number, 'User ID:', user.id);

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
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to verify OTP' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});