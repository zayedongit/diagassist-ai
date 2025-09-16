const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

interface SendOTPRequest {
  phone_number: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Missing Twilio configuration');
    }

    const { phone_number }: SendOTPRequest = await req.json();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('sms_verifications')
      .insert({
        phone_number,
        verification_code: otp,
        expires_at: expiresAt.toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OTP');
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const body = new URLSearchParams({
      To: phone_number,
      From: TWILIO_PHONE_NUMBER,
      Body: `Your DAIG ASSIST verification code is: ${otp}. Valid for 10 minutes.`
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioResult);
      throw new Error('Failed to send SMS');
    }

    // Update database with Twilio SID
    await supabase
      .from('sms_verifications')
      .update({ message_sid: twilioResult.sid })
      .eq('phone_number', phone_number)
      .eq('verification_code', otp);

    console.log('OTP sent successfully to:', phone_number);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        expires_in: 600 // 10 minutes in seconds
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Send OTP error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send OTP' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});