import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  analysisId: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for database access (same as process-pdf-report)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const { analysisId, userId }: AnalysisRequest = await req.json();

    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: 'Analysis ID is required' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log(`🔍 Fetching analysis result for ID: ${analysisId}, User: ${userId || 'anonymous'}`);

    // Query with validation and ordering to get the most recent matching record
    const query = supabase
      .from('pdf_analyses')
      .select('*')
      .eq('id', analysisId)
      .order('created_at', { ascending: false });
    
    // Add user validation if userId is provided
    if (userId) {
      query.eq('user_id', userId);
    }
    
    const { data: analysis, error } = await query.maybeSingle();

    if (error) {
      console.error('❌ Database query error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch analysis result',
          debug: { errorMessage: error.message }
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (!analysis) {
      console.log(`⚠️ Analysis not found or user mismatch for ID: ${analysisId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Analysis not found or access denied'
        }),
        { 
          status: 404,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log(`Successfully retrieved analysis for user ${analysis.user_id}, status: ${analysis.status}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: analysis
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Unexpected error in get-analysis-result function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});