import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { userId } = await req.json();
    
    console.log('📊 Checking storage threshold for user:', userId);
    
    // Count total stored reports
    const { count, error: countError } = await supabase
      .from('pdf_analyses')
      .select('*', { count: 'exact', head: true })
      .not('comprehensive_report_path', 'is', null);
    
    if (countError) {
      console.error('Error counting reports:', countError);
      throw countError;
    }
    
    const totalReports = count || 0;
    console.log(`📈 Total reports stored: ${totalReports}`);
    
    // Define thresholds
    const thresholds = [50, 75, 100];
    const ADMIN_PHONE = '+917993448425';
    
    // Check which threshold we've crossed
    let alertThreshold: number | null = null;
    for (const threshold of thresholds) {
      if (totalReports >= threshold) {
        // Check if we've already alerted for this threshold
        const { data: existingAlert } = await supabase
          .from('storage_alerts')
          .select('id')
          .eq('threshold_reached', threshold)
          .eq('admin_notified', true)
          .order('alerted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!existingAlert) {
          alertThreshold = threshold;
          break; // Alert for the first un-alerted threshold
        }
      }
    }
    
    if (alertThreshold) {
      console.log(`🚨 Threshold ${alertThreshold} reached - sending admin alert`);
      
      // Record alert in database
      await supabase.from('storage_alerts').insert({
        threshold_reached: alertThreshold,
        total_reports: totalReports,
        admin_notified: false // Will be set to true after SMS sent
      });
      
      // Send SMS alert
      let smsMessage = '';
      if (alertThreshold === 50) {
        smsMessage = `📊 Storage Alert: ${totalReports} reports stored. Export to Drive recommended. Login: daigassist.lovable.app/admin`;
      } else if (alertThreshold === 75) {
        smsMessage = `⚠️ Storage Alert: ${totalReports} reports stored. Export urgently needed. Login: daigassist.lovable.app/admin`;
      } else if (alertThreshold === 100) {
        smsMessage = `🚨 Critical: ${totalReports} reports stored. Auto-exporting to Drive...`;
        
        // Trigger automatic export
        console.log('🤖 Triggering automatic export at 100 reports');
        await supabase.functions.invoke('batch-export-to-drive', {
          body: { autoExport: true }
        });
      }
      
      // Send SMS via Twilio
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
      
      if (accountSid && authToken && twilioPhone) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const body = new URLSearchParams({
          To: ADMIN_PHONE,
          From: twilioPhone,
          Body: smsMessage
        });
        
        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString()
        });
        
        if (twilioResponse.ok) {
          console.log('✅ SMS alert sent successfully');
          
          // Update alert record
          await supabase
            .from('storage_alerts')
            .update({ admin_notified: true })
            .eq('threshold_reached', alertThreshold)
            .eq('admin_notified', false);
        } else {
          console.error('❌ SMS alert failed:', await twilioResponse.text());
        }
      }
    } else {
      console.log('✅ No threshold alerts needed');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        totalReports,
        alertSent: !!alertThreshold,
        threshold: alertThreshold
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in check-storage-threshold:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
