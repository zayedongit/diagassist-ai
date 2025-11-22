import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_PHONE = '+917993448425';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      analysisId, 
      error,
      userId, 
      timestamp,
      status = 'failed', // 'success' or 'failed'
      patientName
    } = await req.json();
    
    console.log(`📱 Sending admin SMS alert for analysis: ${analysisId} - Status: ${status}`);
    
    // Hash patient name for privacy
    const hashName = (name: string | undefined) => {
      if (!name) return 'N/A';
      return name.slice(0, 3) + '***' + ` (${name.length})`;
    };

    // Create appropriate message based on status
    let message: string;
    
    if (status === 'success') {
      message = `✅ Daigassist Analysis Success

Analysis ID: ${analysisId.substring(0, 20)}...
Patient: ${hashName(patientName)}
User: ${userId.substring(0, 15)}...
Time: ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Status: Successfully Completed

Report generated and ready for download.`;
    } else {
      message = `🚨 Daigassist Analysis Error

Analysis ID: ${analysisId.substring(0, 20)}...
User: ${userId.substring(0, 15)}...
Time: ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Error: ${error?.substring(0, 100)}${(error?.length || 0) > 100 ? '...' : ''}

Check analytics dashboard.`;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: ADMIN_PHONE,
        From: TWILIO_PHONE!,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error('❌ Twilio SMS failed:', twilioError);
      throw new Error(`Failed to send SMS: ${twilioError}`);
    }

    const twilioData = await twilioResponse.json();
    console.log(`✅ Admin SMS alert sent successfully (${status}). SID:`, twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid,
        sentTo: ADMIN_PHONE,
        status
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Error in send-admin-alert:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error sending alert' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});