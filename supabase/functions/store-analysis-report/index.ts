import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 store-analysis-report function invoked');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    console.log('🔐 Auth header present:', !!authHeader);
    
    const supabaseAuth = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated', details: userError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { analysisId, pdfBase64, reportType, filename } = await req.json();
    
    console.log('📦 Request payload:', {
      analysisId,
      reportType,
      filename,
      pdfBase64Length: pdfBase64?.length,
      userId: user.id
    });

    if (!analysisId || !pdfBase64 || !reportType) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields', received: { analysisId: !!analysisId, pdfBase64: !!pdfBase64, reportType: !!reportType } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('✅ All required fields present');

    // Convert base64 to blob
    console.log('🔄 Converting base64 to buffer...');
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    console.log('✅ Buffer created, size:', pdfBuffer.length, 'bytes');
    
    // Create folder structure: userId/analysisId/filename
    const filePath = `${user.id}/${analysisId}/${filename}`;
    console.log('📁 Target file path:', filePath);
    
    // Upload to storage
    console.log('⬆️ Uploading to storage bucket: analysis-reports');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analysis-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload report', details: uploadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('✅ File uploaded successfully:', uploadData);

    // Update pdf_analyses record with storage path
    const updateField = reportType === 'comprehensive' ? 'comprehensive_report_path' : 'plan_report_path';
    console.log(`📝 Updating database field: ${updateField}`);
    
    const { error: updateError } = await supabase
      .from('pdf_analyses')
      .update({ [updateField]: filePath })
      .eq('id', analysisId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
    } else {
      console.log('✅ Database updated successfully');
    }

    console.log('🎉 Report storage completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        path: filePath,
        message: 'Report stored successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('💥 Critical error in store-analysis-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
