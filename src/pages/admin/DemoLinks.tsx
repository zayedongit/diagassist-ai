import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Edit, Trash2, ExternalLink, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type FeatureTier = 'basic' | 'enhanced' | 'premium';

interface DemoLink {
  id: string;
  token: string;
  client_name: string;
  feature_tier: FeatureTier;
  max_reports: number;
  reports_used: number;
  active: boolean;
  payment_enabled: boolean;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function DemoLinks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [featureTier, setFeatureTier] = useState<FeatureTier>('basic');
  const [maxReports, setMaxReports] = useState(10);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  // Fetch demo links
  const { data: demoLinks, isLoading } = useQuery({
    queryKey: ['demoLinks', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('demo_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('client_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DemoLink[];
    },
  });

  // Create demo link mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-demo-links', {
        body: {
          action: 'create',
          client_name: clientName,
          feature_tier: featureTier,
          max_reports: maxReports,
          payment_enabled: paymentEnabled,
          notes: notes || null,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demoLinks'] });
      toast.success('Demo link created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create demo link: ${error.message}`);
    },
  });

  // Delete demo link mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('manage-demo-links', {
        body: { action: 'delete', demo_link_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demoLinks'] });
      toast.success('Demo link deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.functions.invoke('manage-demo-links', {
        body: { action: 'update', demo_link_id: id, active: !active },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demoLinks'] });
      toast.success('Status updated successfully');
    },
  });

  const resetForm = () => {
    setClientName('');
    setFeatureTier('basic');
    setMaxReports(10);
    setPaymentEnabled(false);
    setNotes('');
  };

  const copyDemoUrl = (token: string) => {
    const url = `${window.location.origin}/demo/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Demo URL copied to clipboard');
  };

  const getTierBadge = (tier: FeatureTier) => {
    const colors = {
      basic: 'bg-blue-500/10 text-blue-500',
      enhanced: 'bg-purple-500/10 text-purple-500',
      premium: 'bg-amber-500/10 text-amber-500',
    };
    return <Badge className={colors[tier]}>{tier.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Demo Links</h2>
          <p className="text-muted-foreground">
            Create and manage demo links for prospect testing
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Demo Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Demo Link</DialogTitle>
              <DialogDescription>
                Generate a new demo link for client testing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="e.g., CrelioHealth"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featureTier">Feature Tier</Label>
                <Select value={featureTier} onValueChange={(v) => setFeatureTier(v as FeatureTier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (Rs 50)</SelectItem>
                    <SelectItem value="enhanced">Enhanced (Rs 100)</SelectItem>
                    <SelectItem value="premium">Premium (Rs 100)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxReports">Max Reports</Label>
                <Input
                  id="maxReports"
                  type="number"
                  value={maxReports}
                  onChange={(e) => setMaxReports(parseInt(e.target.value))}
                  min={1}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="paymentEnabled"
                  checked={paymentEnabled}
                  onChange={(e) => setPaymentEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="paymentEnabled">Require payment</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Internal notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!clientName || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Demo Link'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Demo Links</CardTitle>
          <CardDescription>Manage client demo access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoLinks?.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.client_name}</TableCell>
                    <TableCell>{getTierBadge(link.feature_tier)}</TableCell>
                    <TableCell>
                      {link.reports_used} / {link.max_reports}
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.payment_enabled ? 'default' : 'secondary'}>
                        {link.payment_enabled ? 'Required' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.active ? 'default' : 'secondary'}>
                        {link.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyDemoUrl(link.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ id: link.id, active: link.active })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this demo link?')) {
                              deleteMutation.mutate(link.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
