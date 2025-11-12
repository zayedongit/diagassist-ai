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

    const { token, demoSessionId } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get demo link
    const { data: demoLink, error } = await supabase
      .from('demo_links')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single();

    if (error || !demoLink) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or inactive demo link' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (demoLink.expires_at) {
      const expiry = new Date(demoLink.expires_at);
      if (expiry < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Demo link has expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check usage limit
    if (demoLink.reports_used >= demoLink.max_reports) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Demo link usage limit reached',
          maxReports: demoLink.max_reports
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get usage for this session
    let sessionUsage = 0;
    if (demoSessionId) {
      const { count } = await supabase
        .from('pdf_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('demo_session_id', demoSessionId);
      
      sessionUsage = count || 0;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        featureTier: demoLink.feature_tier,
        reportsRemaining: demoLink.max_reports - demoLink.reports_used,
        clientName: demoLink.client_name,
        paymentEnabled: demoLink.payment_enabled,
        demoLinkId: demoLink.id,
        sessionUsage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-demo-link:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
