import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, LogOut, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminEvent {
  id: string;
  timestamp: string;
  event_type: string;
  phone_number: string;
  is_new_customer: boolean;
  analysis_status?: string;
  failure_reason?: string;
  voice_agent_used?: boolean;
}

interface Stats {
  total_logins: number;
  new_customers: number;
  successful_analyses: number;
  failed_analyses: number;
  voice_agent_usage_rate: number;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeRange, setTimeRange] = useState("24h");
  const [eventType, setEventType] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && autoRefresh) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, autoRefresh, timeRange, eventType]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: hasRole } = await supabase.rpc('has_role', {
        _role: 'admin',
        _user_id: session.user.id
      });
      
      if (hasRole) {
        setIsAuthenticated(true);
        fetchEvents();
      }
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${phoneNumber}@daigassist.app`,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: hasRole } = await supabase.rpc('has_role', {
          _role: 'admin',
          _user_id: data.user.id
        });

        if (hasRole) {
          setIsAuthenticated(true);
          toast({ title: "Login successful" });
        } else {
          await supabase.auth.signOut();
          toast({ title: "Access denied", variant: "destructive" });
        }
      }
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await supabase.functions.invoke('get-realtime-admin-events', {
        body: { timeRange, eventType }
      });

      if (response.data) {
        setEvents(response.data.events || []);
        setStats(response.data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setPhoneNumber("");
    setPassword("");
  };

  const exportToCSV = () => {
    const headers = ['Date & Time', 'Event Type', 'Phone Number', 'Customer Type', 'Analysis Status', 'Failure Reason', 'Voice Agent'];
    const rows = events.map(event => [
      new Date(event.timestamp).toLocaleString(),
      event.event_type,
      event.phone_number,
      event.is_new_customer ? 'New' : 'Old',
      event.analysis_status || '-',
      event.failure_reason || '-',
      event.voice_agent_used ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-purple-600">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-purple-600 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-purple-600 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Real-Time Admin Dashboard</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">Live Updates</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchEvents}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{stats.total_logins}</div>
                <div className="text-sm text-muted-foreground">Total Logins</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.new_customers}</div>
                <div className="text-sm text-muted-foreground">New Customers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.successful_analyses}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.failed_analyses}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.voice_agent_usage_rate}%</div>
                <div className="text-sm text-muted-foreground">Voice Agent</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>Recent Events</CardTitle>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="login">Logins</SelectItem>
                    <SelectItem value="analysis">Analyses</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Voice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs">
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.event_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.phone_number}</TableCell>
                      <TableCell>
                        <Badge variant={event.is_new_customer ? "default" : "secondary"}>
                          {event.is_new_customer ? "New" : "Old"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.analysis_status && (
                          <Badge variant={event.analysis_status === 'success' ? "default" : "destructive"}>
                            {event.analysis_status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.voice_agent_used !== undefined && (
                          <Badge variant={event.voice_agent_used ? "default" : "outline"}>
                            {event.voice_agent_used ? "Yes" : "No"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
