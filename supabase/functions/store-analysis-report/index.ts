import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseAuth = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { analysisId, pdfBase64, reportType, filename } = await req.json();

    if (!analysisId || !pdfBase64 || !reportType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Convert base64 to blob
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Create folder structure: userId/analysisId/filename
    const filePath = `${user.id}/${analysisId}/${filename}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analysis-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload report', details: uploadError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update pdf_analyses record with storage path
    const updateField = reportType === 'comprehensive' ? 'comprehensive_report_path' : 'plan_report_path';
    
    const { error: updateError } = await supabase
      .from('pdf_analyses')
      .update({ [updateField]: filePath })
      .eq('id', analysisId);

    if (updateError) {
      console.error('Database update error:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        path: filePath,
        message: 'Report stored successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in store-analysis-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
