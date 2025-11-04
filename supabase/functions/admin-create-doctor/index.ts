import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get current user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create RLS-bound client using user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get current user and check admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: hasAdminRole } = await supabase.rpc('current_user_has_role', { _role: 'admin' });
    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for user creation (only after authorization)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { 
      email, 
      phone, 
      firstName, 
      lastName, 
      specialization, 
      licenseNumber, 
      experience, 
      bio, 
      consultationFee
    } = await req.json()

    // Admin authorization already verified above

    // Validate required fields
    if (!email || !phone || !firstName || !lastName || !specialization || !licenseNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize phone number to +91XXXXXXXXXX format
    const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/^\+?91?/, '')}`
    
    console.log('Creating doctor account for:', email, 'with phone:', normalizedPhone)

    // Check if phone number is already registered
    const { data: existingProfiles, error: checkError } = await supabaseServiceRole
      .from('profiles')
      .select('phone_number')
      .eq('phone_number', normalizedPhone)

    if (checkError) {
      console.error('Error checking existing phone:', checkError)
      return new Response(
        JSON.stringify({ error: 'Database error while checking phone number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Phone number already registered' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user for the doctor using service role
    const { data: authData, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email: email,
      phone: normalizedPhone,
      user_metadata: {
        user_type: 'doctor',
        first_name: firstName,
        last_name: lastName,
        phone_number: normalizedPhone,
        specialization: specialization,
        license_number: licenseNumber,
        experience_years: parseInt(experience) || 5,
        bio: bio || 'Experienced healthcare professional committed to providing quality care.',
        consultation_fee: parseInt(consultationFee) || 500
      },
      email_confirm: true, // Auto-confirm email
      phone_confirm: true  // Auto-confirm phone
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ error: `Failed to create doctor account: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Doctor auth user created successfully:', authData.user?.id)

    // Explicitly create profile and doctor records (don't rely on trigger)
    try {
      // Insert profile
      const { data: profileData, error: profileError } = await supabaseServiceRole
        .from('profiles')
        .insert({
          user_id: authData.user!.id,
          user_type: 'doctor',
          first_name: firstName,
          last_name: lastName,
          phone_number: normalizedPhone,
          specialization: specialization,
          license_number: licenseNumber
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        throw new Error('Failed to create doctor profile')
      }

      console.log('Profile created successfully:', profileData.id)

      // Insert doctor record
      const { data: doctorData, error: doctorError } = await supabaseServiceRole
        .from('doctors')
        .insert({
          profile_id: profileData.id,
          name: `${firstName} ${lastName}`,
          specialization: specialization,
          license_number: licenseNumber,
          email: email,
          phone_number: normalizedPhone,
          bio: bio || 'Experienced healthcare professional committed to providing quality care.',
          experience_years: parseInt(experience) || 5,
          consultation_fee: parseInt(consultationFee) || 500,
          availability: {
            "monday": {"available": true, "start": "09:00", "end": "17:00"},
            "tuesday": {"available": true, "start": "09:00", "end": "17:00"},
            "wednesday": {"available": true, "start": "09:00", "end": "17:00"},
            "thursday": {"available": true, "start": "09:00", "end": "17:00"},
            "friday": {"available": true, "start": "09:00", "end": "17:00"},
            "saturday": {"available": false, "start": null, "end": null},
            "sunday": {"available": false, "start": null, "end": null}
          },
          is_active: true
        })

      if (doctorError) {
        console.error('Error creating doctor record:', doctorError)
        throw new Error('Failed to create doctor record')
      }

      console.log('Doctor record created successfully')

    } catch (dbError) {
      console.error('Database creation error:', dbError)
      // Try to clean up auth user if database creation fails
      try {
        await supabaseServiceRole.auth.admin.deleteUser(authData.user!.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create doctor records in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Doctor ${firstName} ${lastName} has been successfully onboarded!`,
        userId: authData.user?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-create-doctor function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})