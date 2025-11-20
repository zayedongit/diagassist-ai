import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2 } from 'lucide-react';

interface ExportToDriveDialogProps {
  analysisId: string;
  trigger?: React.ReactNode;
}

export const ExportToDriveDialog = ({ analysisId, trigger }: ExportToDriveDialogProps) => {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!accessToken.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your Google Drive access token',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-to-drive', {
        body: {
          analysisId,
          accessToken: accessToken.trim(),
          folderId: folderId.trim() || undefined
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Success',
          description: data.message || 'Reports exported to Google Drive successfully'
        });
        setOpen(false);
        setAccessToken('');
        setFolderId('');
      } else {
        throw new Error(data?.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export to Google Drive',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Export to Drive
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Google Drive</DialogTitle>
          <DialogDescription>
            Export your analysis reports to Google Drive. You'll need a Google Drive access token.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="access-token">Google Drive Access Token *</Label>
            <Input
              id="access-token"
              type="password"
              placeholder="Enter your access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get your access token from{' '}
              <a 
                href="https://developers.google.com/oauthplayground" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OAuth 2.0 Playground
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-id">Folder ID (Optional)</Label>
            <Input
              id="folder-id"
              placeholder="Enter folder ID to organize files"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to save in root folder
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !accessToken.trim()}>
            {isExporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
