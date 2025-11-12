import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, Users, CheckCircle, XCircle, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Timeframe = 'today' | 'week' | 'month' | 'all-time';

interface AnalyticsSummary {
  totalAnalyses: number;
  uniqueUsers: number;
  completedAnalyses: number;
  failedAnalyses: number;
  pendingAnalyses: number;
  successRate: number;
  avgAnalysesPerUser: number;
  firstAnalysis: string | null;
  lastAnalysis: string | null;
  peakHour: { hour: number; count: number } | null;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  tierDistribution: {
    basic: number;
    enhanced: number;
    premium: number;
  };
  chartData: Array<{
    period: string;
    analyses: number;
    users: number;
    completed: number;
    failed: number;
  }>;
  hourlyDistribution: Record<number, number>;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-usage-analytics', {
        body: { timeframe, groupBy: 'day' }
      });

      if (error) throw error;

      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  const tierColors = {
    basic: 'hsl(var(--chart-1))',
    enhanced: 'hsl(var(--chart-2))',
    premium: 'hsl(var(--chart-3))',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tierChartData = [
    { name: 'Basic', value: data.tierDistribution.basic, color: tierColors.basic },
    { name: 'Enhanced', value: data.tierDistribution.enhanced, color: tierColors.enhanced },
    { name: 'Premium', value: data.tierDistribution.premium, color: tierColors.premium },
  ];

  const hourlyChartData = Object.entries(data.hourlyDistribution).map(([hour, count]) => ({
    hour: formatHour(parseInt(hour)),
    count,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div 
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accentCyan to-primary rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-poppins font-semibold text-foreground">
                  Daigassist
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Analytics Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Usage Analytics</h2>
            <p className="text-muted-foreground mt-1">
              Monitor your medical report analysis tool usage
              <span className="ml-2 text-xs">
                • Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refresh: 30s
              </span>
            </p>
          </div>
          
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="all-time">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.summary.avgAnalysesPerUser} per user avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.summary.completedAnalyses} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.summary.peakHour ? formatHour(data.summary.peakHour.hour) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.summary.peakHour ? `${data.summary.peakHour.count} analyses` : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analyses Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Analyses Over Time</CardTitle>
              <CardDescription>Daily analysis volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={formatDate}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="analyses" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Analyses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Tier Distribution</CardTitle>
              <CardDescription>Usage by tier selection</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tierChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {tierChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Success vs Failed */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Status</CardTitle>
              <CardDescription>Completed vs failed analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={formatDate}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Completed" />
                  <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Hour</CardTitle>
              <CardDescription>Peak usage times</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Analyses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
