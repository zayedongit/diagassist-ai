import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service role client for processing notifications
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

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio configuration');
      throw new Error('SMS service not configured properly');
    }

    console.log('Processing prescription notifications...');

    // Get pending prescription notifications
    const { data: notifications, error: notificationsError } = await supabaseServiceRole
      .from('doctor_prescription_notifications')
      .select(`
        id,
        consultation_id,
        doctor_id,
        patient_id,
        created_at
      `)
      .eq('sms_sent', false)
      .order('created_at', { ascending: true });

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      throw notificationsError;
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending prescription notifications found');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${notifications.length} pending notifications`);
    let processedCount = 0;

    // Process each notification
    for (const notification of notifications) {
      try {
        // Get doctor and patient details
        const { data: doctorData, error: doctorError } = await supabaseServiceRole
          .from('doctors')
          .select('name, phone_number')
          .eq('id', notification.doctor_id)
          .single();

        const { data: patientData, error: patientError } = await supabaseServiceRole
          .from('profiles')
          .select('first_name, last_name, phone_number')
          .eq('id', notification.patient_id)
          .single();

        if (doctorError || !doctorData) {
          console.error('Error fetching doctor data:', doctorError);
          continue;
        }

        if (patientError || !patientData) {
          console.error('Error fetching patient data:', patientError);
          continue;
        }

        const doctorPhone = doctorData.phone_number;
        const patientName = `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim() || 'Patient';

        if (!doctorPhone) {
          console.log(`No phone number for doctor ${doctorData.name}`);
          continue;
        }

        // Format message
        const message = `🏥 DIAGASSIST - Prescription Request

Patient: ${patientName}
Consultation ID: ${notification.consultation_id}

A prescription has been requested through VRDoc consultation. Please review and provide the prescription.

Log in to your dashboard to manage this request.

- DIAGASSIST Medical Platform`;

        console.log(`Sending SMS to doctor ${doctorData.name} at ${doctorPhone}`);

        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const twilioBody = new URLSearchParams({
          To: doctorPhone,
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

        if (!twilioResponse.ok) {
          console.error('Twilio API error:', twilioResult);
          throw new Error(`Twilio error: ${twilioResult.message}`);
        }

        console.log('SMS sent successfully, SID:', twilioResult.sid);

        // Mark notification as sent
        await supabaseServiceRole
          .from('doctor_prescription_notifications')
          .update({
            sms_sent: true,
            sms_sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        // Log SMS to database
        await supabaseServiceRole.from('sms_notifications_log').insert({
          phone_number: doctorPhone,
          message_content: message,
          message_type: 'prescription_request',
          twilio_sid: twilioResult.sid,
          status: twilioResult.status,
          metadata: {
            consultation_id: notification.consultation_id,
            patient_name: patientName,
            doctor_name: doctorData.name
          }
        });

        processedCount++;
        console.log(`Successfully processed notification ${notification.id}`);

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        // Continue processing other notifications
      }
    }

    console.log(`Processed ${processedCount} out of ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        total: notifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-prescription-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});