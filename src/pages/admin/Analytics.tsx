import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, FileText, IndianRupee, Target, Repeat, Link as LinkIcon } from 'lucide-react';

interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
}

interface RetentionCohort {
  cohort: string;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

interface DemoLinkPerformance {
  id: string;
  clientName: string;
  tier: string;
  totalSessions: number;
  completedAnalyses: number;
  conversions: number;
  conversionRate: number;
  avgSessionDuration: number;
}

interface TimeSeriesData {
  date: string;
  signups: number;
  analyses: number;
  payments: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);
  const [retentionCohorts, setRetentionCohorts] = useState<RetentionCohort[]>([]);
  const [demoLinkPerformance, setDemoLinkPerformance] = useState<DemoLinkPerformance[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [kpis, setKpis] = useState({
    totalUsers: 0,
    activeUsers: 0,
    conversionRate: 0,
    avgRevenuePerUser: 0,
    retentionRate: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch conversion funnel data
      await loadConversionFunnel(startDate);

      // Fetch retention cohorts
      await loadRetentionCohorts();

      // Fetch demo link performance
      await loadDemoLinkPerformance(startDate);

      // Fetch time series data
      await loadTimeSeriesData(daysAgo);

      // Calculate KPIs
      await loadKPIs(startDate);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversionFunnel = async (startDate: Date) => {
    // Stage 1: Total users signed up
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Stage 2: Users who uploaded at least one report
    const { data: analyzedUsers } = await supabase
      .from('pdf_analyses')
      .select('user_id')
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'like', 'demo-%')
      .not('user_id', 'like', 'anonymous-%');

    const uniqueAnalyzedUsers = new Set(analyzedUsers?.map(a => a.user_id) || []).size;

    // Stage 3: Users who completed analysis
    const { data: completedUsers } = await supabase
      .from('pdf_analyses')
      .select('user_id')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'like', 'demo-%')
      .not('user_id', 'like', 'anonymous-%');

    const uniqueCompletedUsers = new Set(completedUsers?.map(a => a.user_id) || []).size;

    // Stage 4: Users who made payment
    const { data: paidUsers } = await supabase
      .from('payment_transactions')
      .select('user_id')
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'is', null);

    const uniquePaidUsers = new Set(paidUsers?.map(p => p.user_id) || []).size;

    const total = totalUsers || 1;
    setConversionFunnel([
      { stage: 'Sign Up', count: totalUsers || 0, percentage: 100 },
      { stage: 'Upload Report', count: uniqueAnalyzedUsers, percentage: (uniqueAnalyzedUsers / total) * 100 },
      { stage: 'Analysis Complete', count: uniqueCompletedUsers, percentage: (uniqueCompletedUsers / total) * 100 },
      { stage: 'Payment', count: uniquePaidUsers, percentage: (uniquePaidUsers / total) * 100 },
    ]);
  };

  const loadRetentionCohorts = async () => {
    // Get users from last 5 weeks
    const cohorts: RetentionCohort[] = [];
    
    for (let weekOffset = 4; weekOffset >= 0; weekOffset--) {
      const cohortStart = new Date();
      cohortStart.setDate(cohortStart.getDate() - (weekOffset * 7 + 7));
      const cohortEnd = new Date();
      cohortEnd.setDate(cohortEnd.getDate() - (weekOffset * 7));

      const { data: cohortUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .gte('created_at', cohortStart.toISOString())
        .lt('created_at', cohortEnd.toISOString());

      const cohortUserIds = cohortUsers?.map(u => u.user_id) || [];
      const cohortSize = cohortUserIds.length;

      if (cohortSize === 0) continue;

      // Check retention for each subsequent week
      const retentionWeeks = [];
      for (let week = 0; week <= 4; week++) {
        const weekStart = new Date(cohortEnd);
        weekStart.setDate(weekStart.getDate() + (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const { data: activeUsers } = await supabase
          .from('pdf_analyses')
          .select('user_id')
          .in('user_id', cohortUserIds)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString());

        const uniqueActive = new Set(activeUsers?.map(a => a.user_id) || []).size;
        retentionWeeks.push(Math.round((uniqueActive / cohortSize) * 100));
      }

      cohorts.push({
        cohort: cohortEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        week0: retentionWeeks[0] || 0,
        week1: retentionWeeks[1] || 0,
        week2: retentionWeeks[2] || 0,
        week3: retentionWeeks[3] || 0,
        week4: retentionWeeks[4] || 0,
      });
    }

    setRetentionCohorts(cohorts);
  };

  const loadDemoLinkPerformance = async (startDate: Date) => {
    const { data: demoLinks } = await supabase
      .from('demo_links')
      .select('*')
      .eq('active', true);

    const performance: DemoLinkPerformance[] = [];

    for (const link of demoLinks || []) {
      // Get analyses for this demo link
      const { data: analyses } = await supabase
        .from('pdf_analyses')
        .select('id, status, created_at, updated_at')
        .eq('demo_link_id', link.id)
        .gte('created_at', startDate.toISOString());

      const totalSessions = analyses?.length || 0;
      const completedAnalyses = analyses?.filter(a => a.status === 'completed').length || 0;

      // Get conversions (payments) for this demo link
      const { count: conversions } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('demo_link_id', link.id)
        .eq('status', 'success')
        .gte('created_at', startDate.toISOString());

      const conversionRate = totalSessions > 0 ? (conversions || 0) / totalSessions * 100 : 0;

      // Calculate average session duration (created_at to updated_at)
      const avgDuration = analyses?.reduce((sum, a) => {
        const start = new Date(a.created_at);
        const end = new Date(a.updated_at);
        return sum + (end.getTime() - start.getTime()) / 1000 / 60; // minutes
      }, 0) || 0;
      const avgSessionDuration = totalSessions > 0 ? avgDuration / totalSessions : 0;

      performance.push({
        id: link.id,
        clientName: link.client_name,
        tier: link.feature_tier,
        totalSessions,
        completedAnalyses,
        conversions: conversions || 0,
        conversionRate,
        avgSessionDuration,
      });
    }

    setDemoLinkPerformance(performance.sort((a, b) => b.totalSessions - a.totalSessions));
  };

  const loadTimeSeriesData = async (days: number) => {
    const timeSeriesMap: { [date: string]: TimeSeriesData } = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      timeSeriesMap[dateStr] = {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups: 0,
        analyses: 0,
        payments: 0,
      };
    }

    // Get signups
    const { data: signups } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    signups?.forEach(s => {
      const dateStr = new Date(s.created_at).toISOString().split('T')[0];
      if (timeSeriesMap[dateStr]) timeSeriesMap[dateStr].signups++;
    });

    // Get analyses
    const { data: analyses } = await supabase
      .from('pdf_analyses')
      .select('created_at')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    analyses?.forEach(a => {
      const dateStr = new Date(a.created_at).toISOString().split('T')[0];
      if (timeSeriesMap[dateStr]) timeSeriesMap[dateStr].analyses++;
    });

    // Get payments
    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('paid_at, created_at')
      .eq('status', 'success')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    payments?.forEach(p => {
      const dateStr = new Date(p.paid_at || p.created_at).toISOString().split('T')[0];
      if (timeSeriesMap[dateStr]) timeSeriesMap[dateStr].payments++;
    });

    setTimeSeriesData(Object.values(timeSeriesMap));
  };

  const loadKPIs = async (startDate: Date) => {
    // Total and active users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: activeUsersData } = await supabase
      .from('pdf_analyses')
      .select('user_id')
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'like', 'demo-%')
      .not('user_id', 'like', 'anonymous-%');

    const activeUsers = new Set(activeUsersData?.map(a => a.user_id) || []).size;

    // Conversion rate (users who paid / total users)
    const { data: paidUsers } = await supabase
      .from('payment_transactions')
      .select('user_id')
      .eq('status', 'success')
      .not('user_id', 'is', null);

    const uniquePaidUsers = new Set(paidUsers?.map(p => p.user_id) || []).size;
    const conversionRate = totalUsers ? (uniquePaidUsers / totalUsers) * 100 : 0;

    // Average revenue per user
    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('amount_inr')
      .eq('status', 'success');

    const totalRevenue = payments?.reduce((sum, p) => sum + p.amount_inr, 0) || 0;
    const avgRevenuePerUser = uniquePaidUsers > 0 ? totalRevenue / uniquePaidUsers : 0;

    // Retention rate (active users / total users)
    const retentionRate = totalUsers ? (activeUsers / totalUsers) * 100 : 0;

    setKpis({
      totalUsers: totalUsers || 0,
      activeUsers,
      conversionRate,
      avgRevenuePerUser,
      retentionRate,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">Detailed performance metrics and insights</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed performance metrics and insights</p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">User to payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue/User</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{kpis.avgRevenuePerUser.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per paying user</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Repeat className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.retentionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Active in period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="demo">Demo Links</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Conversion Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>User journey from signup to payment</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: { label: "Users", color: "hsl(var(--chart-1))" },
                }}
                className="h-96"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionFunnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="stage" type="category" width={120} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="mt-6 grid grid-cols-4 gap-4">
                {conversionFunnel.map((stage, index) => (
                  <div key={stage.stage} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {stage.count}
                    </div>
                    <div className="text-sm font-medium">{stage.stage}</div>
                    <div className="text-xs text-muted-foreground">{stage.percentage.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retention Cohorts</CardTitle>
              <CardDescription>Weekly retention rates by user cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Cohort</th>
                      <th className="text-center p-2 font-medium">Week 0</th>
                      <th className="text-center p-2 font-medium">Week 1</th>
                      <th className="text-center p-2 font-medium">Week 2</th>
                      <th className="text-center p-2 font-medium">Week 3</th>
                      <th className="text-center p-2 font-medium">Week 4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionCohorts.map((cohort) => (
                      <tr key={cohort.cohort} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{cohort.cohort}</td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: `hsl(var(--chart-1) / ${cohort.week0 / 100})` }}>
                            {cohort.week0}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: `hsl(var(--chart-2) / ${cohort.week1 / 100})` }}>
                            {cohort.week1}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: `hsl(var(--chart-3) / ${cohort.week2 / 100})` }}>
                            {cohort.week2}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: `hsl(var(--chart-4) / ${cohort.week3 / 100})` }}>
                            {cohort.week3}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: `hsl(var(--chart-5) / ${cohort.week4 / 100})` }}>
                            {cohort.week4}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demo Links Tab */}
        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demo Link Performance</CardTitle>
              <CardDescription>Engagement and conversion metrics by demo link</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Client Name</th>
                      <th className="text-center p-2 font-medium">Tier</th>
                      <th className="text-center p-2 font-medium">Sessions</th>
                      <th className="text-center p-2 font-medium">Completed</th>
                      <th className="text-center p-2 font-medium">Conversions</th>
                      <th className="text-center p-2 font-medium">Conv. Rate</th>
                      <th className="text-center p-2 font-medium">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoLinkPerformance.map((link) => (
                      <tr key={link.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{link.clientName}</td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {link.tier}
                          </span>
                        </td>
                        <td className="p-2 text-center">{link.totalSessions}</td>
                        <td className="p-2 text-center">{link.completedAnalyses}</td>
                        <td className="p-2 text-center">{link.conversions}</td>
                        <td className="p-2 text-center">
                          <span className={`font-medium ${link.conversionRate > 20 ? 'text-green-500' : link.conversionRate > 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {link.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2 text-center">{link.avgSessionDuration.toFixed(1)} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {demoLinkPerformance.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No demo link data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>Daily signups, analyses, and payments over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  signups: { label: "Signups", color: "hsl(var(--chart-1))" },
                  analyses: { label: "Analyses", color: "hsl(var(--chart-2))" },
                  payments: { label: "Payments", color: "hsl(var(--chart-3))" },
                }}
                className="h-96"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="signups" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Signups" />
                    <Line type="monotone" dataKey="analyses" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Analyses" />
                    <Line type="monotone" dataKey="payments" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Payments" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
