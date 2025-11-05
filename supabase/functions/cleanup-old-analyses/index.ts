import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting cleanup of old analysis records...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete completed analyses older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Delete failed analyses older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Fetch old completed analyses
    const { data: completedAnalyses, error: fetchCompletedError } = await supabase
      .from('pdf_analyses')
      .select('id, pdf_path, created_at, status')
      .eq('status', 'completed')
      .lt('updated_at', twentyFourHoursAgo);

    // Fetch old failed analyses
    const { data: failedAnalyses, error: fetchFailedError } = await supabase
      .from('pdf_analyses')
      .select('id, pdf_path, created_at, status')
      .eq('status', 'failed')
      .lt('updated_at', oneHourAgo);

    if (fetchCompletedError || fetchFailedError) {
      console.error('Error fetching old analyses:', fetchCompletedError || fetchFailedError);
      throw fetchCompletedError || fetchFailedError;
    }

    const oldAnalyses = [...(completedAnalyses || []), ...(failedAnalyses || [])];

    if (oldAnalyses.length === 0) {
      console.log('✅ No old analyses to clean up');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No old analyses to clean up',
          deleted: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${oldAnalyses.length} old analyses to clean up (${completedAnalyses?.length || 0} completed, ${failedAnalyses?.length || 0} failed)`);

    // Delete PDFs from storage
    let pdfDeleteCount = 0;
    for (const analysis of oldAnalyses) {
      if (analysis.pdf_path) {
        try {
          const { error: deleteError } = await supabase
            .storage
            .from('medical-reports')
            .remove([analysis.pdf_path]);
          
          if (deleteError) {
            console.error(`Failed to delete PDF ${analysis.pdf_path}:`, deleteError);
          } else {
            pdfDeleteCount++;
            console.log(`✅ Deleted PDF: ${analysis.pdf_path}`);
          }
        } catch (err) {
          console.error(`Error deleting PDF ${analysis.pdf_path}:`, err);
        }
      }
    }

    // Delete analysis records
    const analysisIds = oldAnalyses.map(a => a.id);
    const { error: deleteError } = await supabase
      .from('pdf_analyses')
      .delete()
      .in('id', analysisIds);

    if (deleteError) {
      console.error('Error deleting analysis records:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Cleanup complete: Deleted ${analysisIds.length} analysis records and ${pdfDeleteCount} PDFs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        deleted: {
          analyses: analysisIds.length,
          pdfs: pdfDeleteCount,
          completed: completedAnalyses?.length || 0,
          failed: failedAnalyses?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
