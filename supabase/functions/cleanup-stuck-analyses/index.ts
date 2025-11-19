import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Checking for stuck analyses...');

    // Find analyses stuck in processing for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckAnalyses, error: queryError } = await supabase
      .from('pdf_analyses')
      .select('id, user_id, created_at, filename')
      .eq('status', 'processing')
      .lt('created_at', fiveMinutesAgo);

    if (queryError) {
      throw queryError;
    }

    console.log(`📊 Found ${stuckAnalyses?.length || 0} stuck analyses`);

    if (!stuckAnalyses || stuckAnalyses.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No stuck analyses found',
          count: 0
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark each stuck analysis as failed and send admin alert
    const results = [];
    for (const analysis of stuckAnalyses) {
      try {
        // Update to failed status
        const { error: updateError } = await supabase
          .from('pdf_analyses')
          .update({
            status: 'failed',
            error_message: 'Analysis timeout - stuck in processing state for more than 5 minutes',
            error_timestamp: new Date().toISOString(),
            admin_alerted: true
          })
          .eq('id', analysis.id);

        if (updateError) {
          console.error(`Failed to update analysis ${analysis.id}:`, updateError);
          results.push({ id: analysis.id, success: false, error: updateError.message });
          continue;
        }

        // Send admin SMS alert
        const { error: alertError } = await supabase.functions.invoke('send-admin-alert', {
          body: {
            analysisId: analysis.id,
            userId: analysis.user_id,
            error: `Analysis timeout - stuck in processing for ${analysis.filename}. Created at: ${analysis.created_at}`,
            timestamp: new Date().toISOString()
          }
        });

        if (alertError) {
          console.error(`Failed to send alert for ${analysis.id}:`, alertError);
          results.push({ id: analysis.id, success: true, alertSent: false, error: alertError.message });
        } else {
          console.log(`✅ Processed stuck analysis: ${analysis.id}`);
          results.push({ id: analysis.id, success: true, alertSent: true });
        }
      } catch (err) {
        console.error(`Error processing analysis ${analysis.id}:`, err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id: analysis.id, success: false, error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} stuck analyses`,
        count: results.length,
        results
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Error in cleanup-stuck-analyses:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
