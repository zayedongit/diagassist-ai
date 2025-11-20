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
    
    const { analysisId, accessToken, folderId } = await req.json();

    if (!analysisId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (analysisId, accessToken)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('pdf_analyses')
      .select('comprehensive_report_path, plan_report_path, filename')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const uploadedFiles = [];

    // Upload comprehensive report if exists
    if (analysis.comprehensive_report_path) {
      const { data: fileData } = await supabase.storage
        .from('analysis-reports')
        .download(analysis.comprehensive_report_path);

      if (fileData) {
        const driveFile = await uploadToDrive(
          fileData,
          `comprehensive_${analysis.filename || 'report'}.pdf`,
          accessToken,
          folderId
        );
        uploadedFiles.push(driveFile);
      }
    }

    // Upload plan report if exists
    if (analysis.plan_report_path) {
      const { data: fileData } = await supabase.storage
        .from('analysis-reports')
        .download(analysis.plan_report_path);

      if (fileData) {
        const driveFile = await uploadToDrive(
          fileData,
          `30day_plan_${analysis.filename || 'report'}.pdf`,
          accessToken,
          folderId
        );
        uploadedFiles.push(driveFile);
      }
    }

    // Update analysis record
    if (uploadedFiles.length > 0) {
      await supabase
        .from('pdf_analyses')
        .update({ 
          exported_to_drive: true,
          drive_file_id: uploadedFiles[0].id 
        })
        .eq('id', analysisId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        files: uploadedFiles,
        message: `${uploadedFiles.length} file(s) exported to Google Drive`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in export-to-drive:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function uploadToDrive(
  file: Blob,
  filename: string,
  accessToken: string,
  folderId?: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    ...(folderId && { parents: [folderId] })
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Drive upload failed: ${error}`);
  }

  return await response.json();
}
