import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PrescriptionRequestData {
  consultation_id: string;
  patient_name?: string;
  doctor_phone?: string; // For direct doctor notification
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service role client
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

    const requestData: PrescriptionRequestData = await req.json();
    const { consultation_id, patient_name, doctor_phone } = requestData;

    if (!consultation_id) {
      return new Response(
        JSON.stringify({ error: 'consultation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Marking prescription as requested for consultation: ${consultation_id}`);

    // Update consultation to mark prescription as requested
    const { data: consultation, error: updateError } = await supabaseServiceRole
      .from('consultations')
      .update({
        prescription_requested: true,
        prescription_requested_at: new Date().toISOString()
      })
      .eq('id', consultation_id)
      .select('id, selected_doctor_id, patient_id')
      .single();

    if (updateError) {
      console.error('Error updating consultation:', updateError);
      throw updateError;
    }

    if (!consultation) {
      return new Response(
        JSON.stringify({ error: 'Consultation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully marked prescription as requested');

    // If direct doctor phone is provided, send immediate SMS
    if (doctor_phone) {
      console.log(`Sending immediate SMS to doctor at: ${doctor_phone}`);
      
      const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
      const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
      const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
        const message = `🏥 DAIGASSIST - Prescription Request

Patient: ${patient_name || 'Patient'}
Consultation ID: ${consultation_id}

A prescription has been requested through VRDoc consultation. Please review and provide the prescription.

Log in to your dashboard to manage this request.

- DAIGASSIST Medical Platform`;

        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

          const twilioBody = new URLSearchParams({
            To: doctor_phone,
            From: TWILIO_PHONE_NUMBER,
            Body: message
          });

          const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: twilioBody
          });

          const twilioResult = await twilioResponse.json();

          if (twilioResponse.ok) {
            console.log('Direct SMS sent successfully, SID:', twilioResult.sid);
            
            // Log SMS to database
            await supabaseServiceRole.from('sms_notifications_log').insert({
              phone_number: doctor_phone,
              message_content: message,
              message_type: 'prescription_request',
              twilio_sid: twilioResult.sid,
              status: twilioResult.status,
              metadata: {
                consultation_id: consultation_id,
                patient_name: patient_name || 'Patient',
                direct_notification: true
              }
            });
          } else {
            console.error('Twilio API error:', twilioResult);
          }
        } catch (smsError) {
          console.error('Error sending direct SMS:', smsError);
          // Don't fail the main request if SMS fails
        }
      }
    }

    // Trigger the notification processor in background
    try {
      const processorResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-prescription-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (processorResponse.ok) {
        console.log('Notification processor triggered successfully');
      } else {
        console.log('Failed to trigger notification processor, but prescription marked');
      }
    } catch (processorError) {
      console.error('Error triggering notification processor:', processorError);
      // Don't fail the main request
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        consultation_id: consultation_id,
        message: 'Prescription request marked and notifications triggered',
        direct_sms_sent: !!doctor_phone
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mark-prescription-requested function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});