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
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { phone, role } = await req.json()

    if (!phone || !role) {
      return new Response(
        JSON.stringify({ error: 'Phone number and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking user by phone:', phone, 'for role:', role)

    // Normalize phone number to +91XXXXXXXXXX format
    const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/^\+?91?/, '')}`
    
    console.log('Normalized phone:', normalizedPhone)

    // Special exception for number 7993448425 - allow both patient and doctor login
    const exceptionPhone = '+917993448425'
    if (normalizedPhone === exceptionPhone) {
      console.log('Exception phone number detected, allowing both roles')
      return new Response(
        JSON.stringify({ 
          exists: true,
          role: role, // Return the requested role
          roleMatch: true // Always allow role match for this number
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check profiles table for user with this phone number
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, phone_number')
      .eq('phone_number', normalizedPhone)

    if (profileError) {
      console.error('Error checking profiles:', profileError)
      return new Response(
        JSON.stringify({ error: 'Database error while checking user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userExists = profiles && profiles.length > 0
    const userRole = userExists ? profiles[0].user_type : null

    console.log('User check result:', { exists: userExists, role: userRole, requestedRole: role })

    return new Response(
      JSON.stringify({ 
        exists: userExists,
        role: userRole,
        roleMatch: userExists && userRole === role
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-user-by-phone function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})