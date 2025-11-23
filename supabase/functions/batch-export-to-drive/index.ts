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
    
    const { autoExport, accessToken, folderId } = await req.json();
    
    console.log('📤 Batch export to Drive initiated:', { autoExport });
    
    // Get all non-exported reports
    const { data: reports, error: fetchError } = await supabase
      .from('pdf_analyses')
      .select('id, comprehensive_report_path, user_id')
      .not('comprehensive_report_path', 'is', null)
      .eq('exported_to_drive', false)
      .limit(100); // Limit to 100 reports per batch
    
    if (fetchError) throw fetchError;
    
    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No reports to export', exportedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`📊 Found ${reports.length} reports to export`);
    
    // Use service account or provided credentials
    let driveAccessToken = accessToken;
    let driveFolderId = folderId;
    
    if (autoExport) {
      // For automatic export, use service account credentials
      const serviceAccountKey = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY');
      const defaultFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
      
      if (!serviceAccountKey || !defaultFolderId) {
        console.error('❌ Service account credentials not configured');
        return new Response(
          JSON.stringify({ success: false, error: 'Service account not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      // Get access token from service account
      // TODO: Implement OAuth2 service account token generation
      driveAccessToken = serviceAccountKey; // Placeholder
      driveFolderId = defaultFolderId;
    }
    
    if (!driveAccessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token required for manual export' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Export each report
    let successCount = 0;
    let failCount = 0;
    const exportedIds: string[] = [];
    
    for (const report of reports) {
      try {
        console.log(`📄 Exporting report: ${report.id}`);
        
        // Download report from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('analysis-reports')
          .download(report.comprehensive_report_path);
        
        if (downloadError) throw downloadError;
        
        // Upload to Google Drive
        const metadata = {
          name: `Report_${report.id}.pdf`,
          mimeType: 'application/pdf',
          ...(driveFolderId && { parents: [driveFolderId] })
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', fileData);
        
        const driveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${driveAccessToken}`
          },
          body: form
        });
        
        if (!driveResponse.ok) {
          const errorText = await driveResponse.text();
          console.error(`❌ Drive upload failed for ${report.id}:`, errorText);
          failCount++;
          continue;
        }
        
        const driveResult = await driveResponse.json();
        console.log(`✅ Report ${report.id} exported to Drive:`, driveResult.id);
        
        // Update database
        await supabase
          .from('pdf_analyses')
          .update({ 
            exported_to_drive: true,
            drive_file_id: driveResult.id
          })
          .eq('id', report.id);
        
        exportedIds.push(report.id);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error exporting report ${report.id}:`, error);
        failCount++;
      }
    }
    
    console.log(`✅ Export complete: ${successCount} succeeded, ${failCount} failed`);
    
    // Record export in storage_alerts
    await supabase.from('storage_alerts').insert({
      threshold_reached: autoExport ? 100 : 0,
      total_reports: reports.length,
      export_count: successCount,
      export_method: autoExport ? 'automatic' : 'manual',
      exported_at: new Date().toISOString()
    });
    
    // Send confirmation SMS
    if (successCount > 0) {
      const ADMIN_PHONE = '+917993448425';
      const smsMessage = autoExport 
        ? `✅ ${successCount} reports auto-exported to Drive successfully.`
        : `✅ ${successCount} reports exported to Drive successfully.`;
      
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
        
        await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString()
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        exportedCount: successCount,
        failedCount: failCount,
        exportedIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in batch-export-to-drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
