import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: isAdminData, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const timeRange = url.searchParams.get('timeRange') || 'today';
    const eventType = url.searchParams.get('eventType') || 'all';
    const customerType = url.searchParams.get('customerType') || 'all';
    const analysisStatus = url.searchParams.get('analysisStatus') || 'all';
    const voiceAgentFilter = url.searchParams.get('voiceAgent') || 'all';

    // Calculate date filter based on time range
    let dateFilter = new Date();
    switch (timeRange) {
      case 'today':
        dateFilter.setHours(0, 0, 0, 0);
        break;
      case 'week':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case 'month':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case 'all':
        dateFilter = new Date(0);
        break;
    }

    const dateFilterStr = dateFilter.toISOString();

    // Fetch login events
    let loginQuery = supabase
      .from('user_login_events')
      .select('*')
      .gte('login_timestamp', dateFilterStr)
      .order('login_timestamp', { ascending: false });

    if (customerType === 'new') {
      loginQuery = loginQuery.eq('is_new_user', true);
    } else if (customerType === 'old') {
      loginQuery = loginQuery.eq('is_new_user', false);
    }

    const { data: logins, error: loginError } = await loginQuery;

    if (loginError) {
      console.error('Error fetching logins:', loginError);
    }

    // Fetch analysis events with profile data
    let analysisQuery = supabase
      .from('pdf_analyses')
      .select(`
        id,
        user_id,
        status,
        error_message,
        voice_agent_used,
        created_at,
        filename,
        feature_tier
      `)
      .gte('created_at', dateFilterStr)
      .order('created_at', { ascending: false });

    if (analysisStatus === 'success') {
      analysisQuery = analysisQuery.eq('status', 'completed');
    } else if (analysisStatus === 'failed') {
      analysisQuery = analysisQuery.eq('status', 'failed');
    }

    if (voiceAgentFilter === 'used') {
      analysisQuery = analysisQuery.eq('voice_agent_used', true);
    } else if (voiceAgentFilter === 'not_used') {
      analysisQuery = analysisQuery.eq('voice_agent_used', false);
    }

    const { data: analyses, error: analysisError } = await analysisQuery;

    if (analysisError) {
      console.error('Error fetching analyses:', analysisError);
    }

    // Get profiles for analyses to determine new vs old customer
    const analysisUserIds = [...new Set(analyses?.map(a => a.user_id).filter(Boolean) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, phone_number, created_at')
      .in('user_id', analysisUserIds);

    // Get first analysis date for each user to determine if new customer
    const { data: firstAnalyses } = await supabase
      .from('pdf_analyses')
      .select('user_id, created_at')
      .in('user_id', analysisUserIds)
      .order('created_at', { ascending: true });

    const firstAnalysisMap = new Map();
    firstAnalyses?.forEach(fa => {
      if (!firstAnalysisMap.has(fa.user_id)) {
        firstAnalysisMap.set(fa.user_id, fa.created_at);
      }
    });

    // Enrich analyses with profile data
    const enrichedAnalyses = analyses?.map(analysis => {
      const profile = profiles?.find(p => p.user_id === analysis.user_id);
      const firstAnalysisDate = firstAnalysisMap.get(analysis.user_id);
      const isNewCustomer = firstAnalysisDate && 
        new Date(analysis.created_at).getTime() - new Date(firstAnalysisDate).getTime() < 60000; // Within 1 minute
      
      return {
        ...analysis,
        phone_number: profile?.phone_number,
        is_new_customer: isNewCustomer || false,
      };
    }) || [];

    // Combine events
    const events: any[] = [];

    if (eventType === 'all' || eventType === 'login') {
      logins?.forEach(login => {
        events.push({
          id: login.id,
          type: 'login',
          timestamp: login.login_timestamp,
          phone_number: login.phone_number,
          is_new_user: login.is_new_user,
          device_info: login.device_info,
          user_id: login.user_id,
        });
      });
    }

    if (eventType === 'all' || eventType === 'analysis') {
      enrichedAnalyses.forEach(analysis => {
        events.push({
          id: analysis.id,
          type: 'analysis',
          timestamp: analysis.created_at,
          phone_number: analysis.phone_number,
          is_new_customer: analysis.is_new_customer,
          status: analysis.status,
          error_message: analysis.error_message,
          voice_agent_used: analysis.voice_agent_used,
          filename: analysis.filename,
          user_id: analysis.user_id,
          feature_tier: analysis.feature_tier,
        });
      });
    }

    // Sort all events by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate summary statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const todayLogins = logins?.filter(l => new Date(l.login_timestamp) >= today) || [];
    const todayAnalyses = enrichedAnalyses?.filter(a => new Date(a.created_at) >= today) || [];

    const summary = {
      total_logins_today: todayLogins.length,
      new_customers_today: todayLogins.filter(l => l.is_new_user).length,
      successful_analyses_today: todayAnalyses.filter(a => a.status === 'completed').length,
      failed_analyses_today: todayAnalyses.filter(a => a.status === 'failed').length,
      voice_agent_usage_rate: todayAnalyses.length > 0 
        ? Math.round((todayAnalyses.filter(a => a.voice_agent_used).length / todayAnalyses.length) * 100)
        : 0,
      total_events: events.length,
    };

    return new Response(
      JSON.stringify({ 
        events,
        summary,
        filters: {
          timeRange,
          eventType,
          customerType,
          analysisStatus,
          voiceAgentFilter,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-realtime-admin-events:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
