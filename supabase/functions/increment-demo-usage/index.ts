import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, analysisId, demoSessionId } = await req.json();

    if (!token || !analysisId) {
      return new Response(
        JSON.stringify({ error: 'Token and analysisId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get demo link
    const { data: demoLink, error: fetchError } = await supabase
      .from('demo_links')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !demoLink) {
      return new Response(
        JSON.stringify({ error: 'Demo link not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Increment usage and update last_used_at
    const { error: updateError } = await supabase
      .from('demo_links')
      .update({
        reports_used: demoLink.reports_used + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', demoLink.id);

    if (updateError) throw updateError;

    const reportsRemaining = demoLink.max_reports - (demoLink.reports_used + 1);

    return new Response(
      JSON.stringify({
        success: true,
        reportsRemaining,
        totalUsed: demoLink.reports_used + 1,
        maxReports: demoLink.max_reports
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in increment-demo-usage:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
