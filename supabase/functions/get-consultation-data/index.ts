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
    // Get current user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create RLS-bound client using user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for storage operations (only after authorization)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { analysis_id, consultation_id, patient_name } = await req.json();

    if (!analysis_id && !consultation_id) {
      return new Response(
        JSON.stringify({ error: 'Either analysis_id or consultation_id is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    let analysisData = null;
    let consultationData = null;
    let patientDetails = null;

    // If consultation_id is provided, fetch consultation and related data
    if (consultation_id) {
      // Fetch consultation data using RLS
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select(`
          *,
          profiles!consultations_patient_id_fkey (
            first_name,
            last_name,
            phone_number,
            age,
            gender
          )
        `)
        .eq('id', consultation_id)
        .single();

      if (consultationError) {
        console.error('Error fetching consultation:', consultationError);
        return new Response(
          JSON.stringify({ error: 'Consultation not found' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }

      consultationData = consultation;
      patientDetails = consultation.profiles;

      // If consultation has analysis_id, fetch the analysis
      if (consultation.analysis_id) {
        // Fetch analysis data using RLS if consultation has analysis_id
        const { data: analysis, error: analysisError } = await supabase
          .from('pdf_analyses')
          .select('*')
          .eq('id', consultation.analysis_id)
          .single();

        if (!analysisError) {
          analysisData = analysis;
        }
      }
    } 
    // If only analysis_id is provided, fetch analysis data
    else if (analysis_id) {
      // Direct analysis fetch using RLS
      const { data: analysis, error: analysisError } = await supabase
        .from('pdf_analyses')
        .select('*')
        .eq('id', analysis_id)
        .single();

      if (analysisError) {
        console.error('Error fetching analysis:', analysisError);
        return new Response(
          JSON.stringify({ error: 'Analysis not found' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }

      analysisData = analysis;
    }

    // Generate signed URL for PDF if available
    let pdfDownloadUrl = null;
    if (analysisData?.pdf_path) {
      try {
        console.log(`Generating signed URL for PDF: ${analysisData.pdf_path}`);
        
        const { data: signedUrlData, error: urlError } = await supabaseServiceRole.storage
          .from('medical-reports')
          .createSignedUrl(analysisData.pdf_path, 3600); // 1 hour expiry

        if (urlError) {
          console.error('Error generating signed URL:', urlError);
        } else {
          pdfDownloadUrl = signedUrlData.signedUrl;
          console.log('PDF signed URL generated successfully');
        }
      } catch (urlGenError) {
        console.error('Failed to generate PDF URL:', urlGenError);
      }
    }

    // Prepare comprehensive response data for visual-doc-assist
    const responseData = {
      consultation_id: consultation_id || null,
      analysis_id: analysisData?.id || analysis_id || null,
      
      // Patient information
      patient_name: patientDetails ? 
        `${patientDetails.first_name || ''} ${patientDetails.last_name || ''}`.trim() : 
        (patient_name || 'Unknown Patient'),
      first_name: patientDetails?.first_name || '',
      last_name: patientDetails?.last_name || '',
      phone_number: patientDetails?.phone_number || '',
      age: patientDetails?.age || null,
      gender: patientDetails?.gender || '',
      
      // Analysis data
      pdf_filename: analysisData?.filename || '',
      analysis_result: analysisData?.result || null,
      analysis_status: analysisData?.status || '',
      analysis_created_at: analysisData?.created_at || null,
      pdf_download_url: pdfDownloadUrl,
      
      // Consultation data
      consultation_type: consultationData?.consultation_type || '',
      symptoms: consultationData?.symptoms || '',
      consultation_status: consultationData?.status || '',
      consultation_created_at: consultationData?.created_at || null,
      
      source_app: 'daigasst-health-ai'
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in get-consultation-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})