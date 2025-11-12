import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Link as LinkIcon, FlaskConical, TrendingUp, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalUsers: number;
  activeDemoLinks: number;
  totalAnalyses: number;
  labIntegrations: number;
  recentActivity: number;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeDemoLinks: 0,
    totalAnalyses: 0,
    labIntegrations: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

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

      setStats({
        totalUsers: usersCount || 0,
        activeDemoLinks: demoCount || 0,
        totalAnalyses: analysesCount || 0,
        labIntegrations: labCount || 0,
        recentActivity: recentCount || 0,
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
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome to your admin dashboard</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
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
