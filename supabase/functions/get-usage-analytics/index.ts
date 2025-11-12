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

    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe') || 'all-time'; // today, week, month, all-time
    const groupBy = url.searchParams.get('groupBy') || 'day'; // hour, day, week, month

    // Calculate date range based on timeframe
    let dateFilter = '';
    const now = new Date();
    
    switch (timeframe) {
      case 'today':
        dateFilter = `created_at >= '${new Date(now.setHours(0, 0, 0, 0)).toISOString()}'`;
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${weekAgo.toISOString()}'`;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `created_at >= '${monthAgo.toISOString()}'`;
        break;
      default:
        dateFilter = 'true';
    }

    // Get overall statistics
    const { data: overallStats, error: overallError } = await supabase
      .from('pdf_analyses')
      .select('*', { count: 'exact', head: false });

    if (overallError) throw overallError;

    const filteredData = dateFilter === 'true' 
      ? overallStats 
      : overallStats?.filter(item => {
          const itemDate = new Date(item.created_at);
          return eval(dateFilter.replace('created_at', `new Date('${item.created_at}')`));
        });

    const totalAnalyses = filteredData?.length || 0;
    const uniqueUsers = new Set(filteredData?.map(item => item.user_id)).size;
    const completedAnalyses = filteredData?.filter(item => item.status === 'completed').length || 0;
    const failedAnalyses = filteredData?.filter(item => item.status === 'failed').length || 0;
    const pendingAnalyses = filteredData?.filter(item => item.status === 'pending').length || 0;

    // Calculate success rate
    const successRate = totalAnalyses > 0 ? (completedAnalyses / totalAnalyses * 100).toFixed(1) : 0;

    // Get tier distribution
    const tierCounts = {
      basic: filteredData?.filter(item => item.feature_tier === 'basic').length || 0,
      enhanced: filteredData?.filter(item => item.feature_tier === 'enhanced').length || 0,
      premium: filteredData?.filter(item => item.feature_tier === 'premium').length || 0,
    };

    // Group data by time period for charts
    const timeSeriesData = filteredData?.reduce((acc, item) => {
      const date = new Date(item.created_at);
      let key = '';
      
      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!acc[key]) {
        acc[key] = {
          period: key,
          analyses: 0,
          uniqueUsers: new Set(),
          completed: 0,
          failed: 0,
        };
      }

      acc[key].analyses += 1;
      acc[key].uniqueUsers.add(item.user_id);
      if (item.status === 'completed') acc[key].completed += 1;
      if (item.status === 'failed') acc[key].failed += 1;

      return acc;
    }, {} as Record<string, any>) || {};

    // Convert to array and format for charts
    const chartData = Object.values(timeSeriesData)
      .map((item: any) => ({
        period: item.period,
        analyses: item.analyses,
        users: item.uniqueUsers.size,
        completed: item.completed,
        failed: item.failed,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Get peak usage times (hour of day)
    const hourlyDistribution = filteredData?.reduce((acc, item) => {
      const hour = new Date(item.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>) || {};

    const peakHour = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    // Calculate average analyses per user
    const avgAnalysesPerUser = uniqueUsers > 0 
      ? (totalAnalyses / uniqueUsers).toFixed(1) 
      : 0;

    // Get first and last analysis dates
    const sortedByDate = [...(filteredData || [])].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstAnalysis = sortedByDate[0]?.created_at || null;
    const lastAnalysis = sortedByDate[sortedByDate.length - 1]?.created_at || null;

    console.log(`Analytics fetched: ${totalAnalyses} analyses, ${uniqueUsers} unique users (${timeframe})`);

    return new Response(
      JSON.stringify({
        success: true,
        timeframe,
        groupBy,
        summary: {
          totalAnalyses,
          uniqueUsers,
          completedAnalyses,
          failedAnalyses,
          pendingAnalyses,
          successRate: typeof successRate === 'string' ? parseFloat(successRate) : successRate,
          avgAnalysesPerUser: typeof avgAnalysesPerUser === 'string' ? parseFloat(avgAnalysesPerUser) : avgAnalysesPerUser,
          firstAnalysis,
          lastAnalysis,
          peakHour: peakHour ? {
            hour: parseInt(peakHour[0]),
            count: peakHour[1],
          } : null,
        },
        tierDistribution: tierCounts,
        chartData,
        hourlyDistribution,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-usage-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
