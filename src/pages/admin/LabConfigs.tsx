import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Key, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type FeatureTier = 'basic' | 'enhanced' | 'premium';

interface LabConfig {
  id: string;
  lab_name: string;
  api_key: string;
  feature_tier: FeatureTier;
  webhook_url: string | null;
  rate_limit_per_minute: number;
  active: boolean;
  created_at: string;
}

export default function LabConfigs() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [labName, setLabName] = useState('');
  const [featureTier, setFeatureTier] = useState<FeatureTier>('basic');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [rateLimit, setRateLimit] = useState(60);

  const queryClient = useQueryClient();

  // Fetch lab configurations
  const { data: labConfigs, isLoading } = useQuery({
    queryKey: ['labConfigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LabConfig[];
    },
  });

  // Create lab config mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-lab-configs', {
        body: {
          action: 'create',
          lab_name: labName,
          feature_tier: featureTier,
          webhook_url: webhookUrl || null,
          rate_limit_per_minute: rateLimit,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labConfigs'] });
      toast.success('Lab configuration created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lab config: ${error.message}`);
    },
  });

  // Delete lab config mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('manage-lab-configs', {
        body: { action: 'delete', lab_config_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labConfigs'] });
      toast.success('Lab configuration deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.functions.invoke('manage-lab-configs', {
        body: { action: 'update', lab_config_id: id, active: !active },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labConfigs'] });
      toast.success('Status updated');
    },
  });

  const resetForm = () => {
    setLabName('');
    setFeatureTier('basic');
    setWebhookUrl('');
    setRateLimit(60);
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard');
  };

  const getTierBadge = (tier: FeatureTier) => {
    const colors = {
      basic: 'bg-blue-500/10 text-blue-500',
      enhanced: 'bg-purple-500/10 text-purple-500',
      premium: 'bg-amber-500/10 text-amber-500',
    };
    return <Badge className={colors[tier]}>{tier.toUpperCase()}</Badge>;
  };

  const maskApiKey = (key: string) => {
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lab API Configurations</h2>
          <p className="text-muted-foreground">
            Manage lab integrations and API access
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lab Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Lab Integration</DialogTitle>
              <DialogDescription>
                Configure a new lab system API integration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="labName">Lab Name</Label>
                <Input
                  id="labName"
                  placeholder="e.g., CrelioHealth Labs"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
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
                <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://api.lab.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Results will be sent here when analysis completes
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rateLimit">Rate Limit (requests/min)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value))}
                  min={1}
                  max={600}
                />
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!labName || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Integration'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Lab Integrations</CardTitle>
          <CardDescription>API keys and configuration settings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : labConfigs && labConfigs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lab Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.lab_name}</TableCell>
                    <TableCell>{getTierBadge(config.feature_tier)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{maskApiKey(config.api_key)}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyApiKey(config.api_key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{config.rate_limit_per_minute}/min</TableCell>
                    <TableCell>
                      <Badge variant={config.active ? 'default' : 'secondary'}>
                        {config.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ id: config.id, active: config.active })}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this lab integration?')) {
                              deleteMutation.mutate(config.id);
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No lab integrations configured yet
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>Integration endpoints for lab systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Submit Report for Analysis</h4>
            <code className="block bg-muted p-3 rounded text-xs">
              POST {window.location.origin}/api/analyze-report
              <br />
              Headers: Authorization: Bearer YOUR_API_KEY
              <br />
              Body: {`{ "reportUrl": "...", "filename": "..." }`}
            </code>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Check Analysis Status</h4>
            <code className="block bg-muted p-3 rounded text-xs">
              GET {window.location.origin}/api/analysis-status/:analysisId
              <br />
              Headers: Authorization: Bearer YOUR_API_KEY
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
