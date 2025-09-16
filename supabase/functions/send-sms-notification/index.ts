import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  to: string;
  message: string;
  type: 'appointment_booking' | 'prescription_ready' | 'appointment_reminder' | 'general';
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authorized to send SMS (doctors only)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.user_type !== 'doctor') {
      return new Response(
        JSON.stringify({ error: 'Only doctors can send SMS notifications' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for SMS operations (only after authorization)
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

    // Get Twilio credentials from environment
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio configuration');
      throw new Error('SMS service not configured properly');
    }

    // Parse request body
    const smsRequest: SMSRequest = await req.json();
    const { to, message, type, metadata } = smsRequest;

    if (!to || !message || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message, type' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending SMS to ${to} with message: ${message.substring(0, 50)}...`);

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const twilioBody = new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Body: message
    });

    // Send SMS via Twilio
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: twilioBody
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', twilioResult);
      throw new Error(`Twilio error: ${twilioResult.message}`);
    }

    console.log('SMS sent successfully, SID:', twilioResult.sid);

    // Log SMS to database using service role for system operations
    await supabaseServiceRole.from('sms_notifications_log').insert({
      phone_number: to,
      message_content: message,
      message_type: type,
      twilio_sid: twilioResult.sid,
      status: twilioResult.status,
      metadata: metadata || {}
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: twilioResult.sid,
        status: twilioResult.status
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-sms-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});