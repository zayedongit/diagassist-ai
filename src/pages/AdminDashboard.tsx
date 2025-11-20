import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, RefreshCw, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Analysis {
  id: string;
  created_at: string;
  status: string;
  user_id: string;
  filename: string | null;
  admin_alerted: boolean;
  admin_notified_success: boolean;
  admin_notified_at: string | null;
  error_message: string | null;
  result: any;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [notificationFilter, setNotificationFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }

    if (user) {
      checkAdminAccess();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAccess = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('user_id', user!.id)
        .single();

      if (!profile || profile.phone_number !== '+917993448425') {
        toast.error('Unauthorized access');
        navigate('/');
        return;
      }

      fetchAnalyses();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-all-analyses', {
        body: {},
        method: 'POST',
      });

      if (error) throw error;

      setAnalyses(data.analyses || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast.error('Failed to fetch analyses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      completed: { variant: 'default', icon: CheckCircle2 },
      failed: { variant: 'destructive', icon: XCircle },
      pending: { variant: 'secondary', icon: Clock },
      processing: { variant: 'secondary', icon: RefreshCw },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getNotificationBadge = (analysis: Analysis) => {
    if (analysis.admin_notified_at) {
      return (
        <Badge variant={analysis.admin_notified_success ? 'default' : 'destructive'} className="flex items-center gap-1">
          {analysis.admin_notified_success ? (
            <><CheckCircle2 className="h-3 w-3" /> Success</>
          ) : (
            <><XCircle className="h-3 w-3" /> Failed</>
          )}
        </Badge>
      );
    }
    if (analysis.error_message) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> No Alert
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
  };

  const getPatientName = (analysis: Analysis) => {
    try {
      if (analysis.result?.patientName) {
        return analysis.result.patientName;
      }
      if (analysis.result?.demographics?.name) {
        return analysis.result.demographics.name;
      }
    } catch (e) {
      console.error('Error extracting patient name:', e);
    }
    return 'Unknown';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Admin Dashboard - Analysis & SMS Notifications</CardTitle>
            <Button onClick={fetchAnalyses} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="flex gap-4 mt-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Analysis Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={notificationFilter} onValueChange={setNotificationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Notification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="sent">SMS Sent</SelectItem>
                <SelectItem value="failed">SMS Failed</SelectItem>
                <SelectItem value="pending">Pending SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            Total Analyses: {total}
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Analysis ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SMS Status</TableHead>
                  <TableHead>SMS Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No analyses found
                    </TableCell>
                  </TableRow>
                ) : (
                  analyses.map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell className="font-mono text-xs">
                        {analysis.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {getPatientName(analysis)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {analysis.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{formatDate(analysis.created_at)}</TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell>{getNotificationBadge(analysis)}</TableCell>
                      <TableCell>{formatDate(analysis.admin_notified_at)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {analysis.error_message || 'None'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
