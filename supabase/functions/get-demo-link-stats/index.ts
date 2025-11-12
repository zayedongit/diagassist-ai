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

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const url = new URL(req.url);
    const linkId = url.searchParams.get('linkId');

    if (!linkId) {
      return new Response(
        JSON.stringify({ error: 'linkId parameter is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get demo link
    const { data: link, error: linkError } = await supabase
      .from('demo_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (linkError) throw linkError;

    // Get all analyses for this demo link
    const { data: analyses, error: analysesError } = await supabase
      .from('pdf_analyses')
      .select('*')
      .eq('demo_link_id', linkId)
      .order('created_at', { ascending: false });

    if (analysesError) throw analysesError;

    // Calculate usage by day
    const usageByDay: { [key: string]: number } = {};
    analyses?.forEach(analysis => {
      const date = new Date(analysis.created_at).toISOString().split('T')[0];
      usageByDay[date] = (usageByDay[date] || 0) + 1;
    });

    // Calculate conversion rate if payment is enabled
    let conversionRate = 0;
    if (link.payment_enabled) {
      const { count: paidCount } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('demo_link_id', linkId)
        .eq('status', 'success');

      if (analyses && analyses.length > 0) {
        conversionRate = ((paidCount || 0) / analyses.length) * 100;
      }
    }

    return new Response(
      JSON.stringify({
        link,
        analyses,
        usageByDay,
        conversionRate,
        totalSessions: new Set(analyses?.map(a => a.demo_session_id)).size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-demo-link-stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
