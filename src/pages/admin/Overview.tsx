import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Link as LinkIcon, FlaskConical, TrendingUp, Activity, IndianRupee, FileText, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Stats {
  totalUsers: number;
  activeDemoLinks: number;
  totalAnalyses: number;
  labIntegrations: number;
  recentActivity: number;
  totalRevenue: number;
  revenueByTier: { basic: number; enhanced: number; premium: number };
}

interface ActivityItem {
  id: string;
  type: 'signup' | 'analysis' | 'payment';
  description: string;
  timestamp: string;
}

interface RevenueData {
  date: string;
  revenue: number;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeDemoLinks: 0,
    totalAnalyses: 0,
    labIntegrations: 0,
    recentActivity: 0,
    totalRevenue: 0,
    revenueByTier: { basic: 0, enhanced: 0, premium: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [revenueChart, setRevenueChart] = useState<RevenueData[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active demo links
      const { count: demoCount } = await supabase
        .from('demo_links')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      // Get total analyses
      const { count: analysesCount } = await supabase
        .from('pdf_analyses')
        .select('*', { count: 'exact', head: true });

      // Get lab integrations
      const { count: labCount } = await supabase
        .from('lab_configurations')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      // Get recent activity (last 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: recentCount } = await supabase
        .from('pdf_analyses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Get revenue data
      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('amount_inr, feature_tier, paid_at, created_at')
        .eq('status', 'success');

      const totalRevenue = payments?.reduce((sum, p) => sum + p.amount_inr, 0) || 0;
      const revenueByTier = {
        basic: payments?.filter(p => p.feature_tier === 'basic').reduce((sum, p) => sum + p.amount_inr, 0) || 0,
        enhanced: payments?.filter(p => p.feature_tier === 'enhanced').reduce((sum, p) => sum + p.amount_inr, 0) || 0,
        premium: payments?.filter(p => p.feature_tier === 'premium').reduce((sum, p) => sum + p.amount_inr, 0) || 0,
      };

      // Get recent activities
      const { data: recentAnalyses } = await supabase
        .from('pdf_analyses')
        .select('id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, created_at, first_name, last_name')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentPayments } = await supabase
        .from('payment_transactions')
        .select('id, created_at, amount_inr, feature_tier')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: ActivityItem[] = [
        ...(recentAnalyses?.map(a => ({
          id: a.id,
          type: 'analysis' as const,
          description: `Analysis completed`,
          timestamp: a.created_at,
        })) || []),
        ...(recentUsers?.map(u => ({
          id: u.id,
          type: 'signup' as const,
          description: `New user: ${u.first_name} ${u.last_name || ''}`.trim(),
          timestamp: u.created_at,
        })) || []),
        ...(recentPayments?.map(p => ({
          id: p.id,
          type: 'payment' as const,
          description: `Payment: ₹${p.amount_inr} (${p.feature_tier})`,
          timestamp: p.created_at,
        })) || []),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      setRecentActivities(activities);

      // Revenue chart (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const revenueByDay = last7Days.map(date => {
        const dayRevenue = payments?.filter(p => {
          const paymentDate = new Date(p.paid_at || p.created_at).toISOString().split('T')[0];
          return paymentDate === date;
        }).reduce((sum, p) => sum + p.amount_inr, 0) || 0;

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
        };
      });

      setRevenueChart(revenueByDay);

      setStats({
        totalUsers: usersCount || 0,
        activeDemoLinks: demoCount || 0,
        totalAnalyses: analysesCount || 0,
        labIntegrations: labCount || 0,
        recentActivity: recentCount || 0,
        totalRevenue,
        revenueByTier,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered users',
      color: 'text-blue-500',
    },
    {
      title: 'Active Demo Links',
      value: stats.activeDemoLinks,
      icon: LinkIcon,
      description: 'Currently active',
      color: 'text-green-500',
    },
    {
      title: 'Total Analyses',
      value: stats.totalAnalyses,
      icon: TrendingUp,
      description: 'Reports processed',
      color: 'text-purple-500',
    },
    {
      title: 'Lab Integrations',
      value: stats.labIntegrations,
      icon: FlaskConical,
      description: 'Active integrations',
      color: 'text-orange-500',
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity,
      icon: Activity,
      description: 'Last 24 hours',
      color: 'text-pink-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: IndianRupee,
      description: 'All time',
      color: 'text-emerald-500',
    },
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'analysis': return <FileText className="h-4 w-4 text-purple-500" />;
      case 'payment': return <IndianRupee className="h-4 w-4 text-emerald-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome to your admin dashboard</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome to your admin dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Last 7 days revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Basic Tier</p>
                <p className="text-lg font-bold">₹{stats.revenueByTier.basic}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Enhanced Tier</p>
                <p className="text-lg font-bold">₹{stats.revenueByTier.enhanced}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Premium Tier</p>
                <p className="text-lg font-bold">₹{stats.revenueByTier.premium}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <h3 className="font-semibold">Manage Users</h3>
              <p className="text-sm text-muted-foreground">View and manage user accounts</p>
            </div>
          </a>

          <a
            href="/admin/demo-links"
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <LinkIcon className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold">Create Demo Link</h3>
              <p className="text-sm text-muted-foreground">Generate new demo links</p>
            </div>
          </a>

          <a
            href="/admin/labs"
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <FlaskConical className="h-8 w-8 text-orange-500" />
            <div>
              <h3 className="font-semibold">Lab Integrations</h3>
              <p className="text-sm text-muted-foreground">Manage lab API configs</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
