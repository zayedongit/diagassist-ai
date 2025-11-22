import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

// Input validation schema
const SendOTPSchema = z.object({
  phone_number: z.string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format')
    .min(10, 'Phone number too short')
    .max(15, 'Phone number too long')
});

interface SendOTPRequest {
  phone_number: string;
}

function generateOTP(): string {
  // Use crypto.getRandomValues for secure random numbers
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return 'XXX';
  return phone.slice(0, 3) + 'XXXXX' + phone.slice(-4);
}

async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const { data, error } = await supabase
    .from('api_rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error', { code: error.code });
    return true; // Allow on error to avoid blocking legitimate users
  }

  if (data && data.request_count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Update or insert rate limit record
  const newCount = (data?.request_count || 0) + 1;
  const newWindowStart = data?.window_start || new Date().toISOString();

  await supabase.from('api_rate_limits').upsert({
    identifier,
    endpoint,
    request_count: newCount,
    window_start: newWindowStart
  }, {
    onConflict: 'identifier,endpoint'
  });

  return true;
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

    const body = await req.json();
    
    // Validate input with zod
    const validation = SendOTPSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input',
          details: validation.error.issues[0].message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { phone_number } = validation.data;
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limits: 3 per phone per hour, 10 per IP per hour
    const phoneAllowed = await checkRateLimit(supabase, phone_number, 'send-otp', 3, 60);
    const ipAllowed = await checkRateLimit(supabase, `ip_${clientIP}`, 'send-otp', 10, 60);

    if (!phoneAllowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many OTP requests for this phone number. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests from your location. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    
    const smsBody = new URLSearchParams({
      To: phone_number,
      From: TWILIO_PHONE_NUMBER,
      Body: `Your PREDLABS Medical Analytics verification code is: ${otp}. Valid for 10 minutes.`
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: smsBody.toString()
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      // Secure logging: only log error code, not full response
      console.error('Twilio SMS failed', { 
        code: twilioResult.code || 'UNKNOWN',
        status: twilioResponse.status,
        phone: maskPhone(phone_number)
      });
      throw new Error('Failed to send SMS');
    }

    // Update database with Twilio SID
    await supabase
      .from('sms_verifications')
      .update({ message_sid: twilioResult.sid })
      .eq('phone_number', phone_number)
      .eq('verification_code', otp);

    // Secure logging: mask phone number
    console.log('OTP sent successfully', { 
      phone: maskPhone(phone_number),
      timestamp: new Date().toISOString()
    });

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
    const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});