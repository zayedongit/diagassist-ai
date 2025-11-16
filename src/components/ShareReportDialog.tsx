import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ShareReportDialogProps {
  reportId: string;
}

export const ShareReportDialog = ({ reportId }: ShareReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState("7");
  const [notes, setNotes] = useState("");
  const { user } = useAuth();

  const generateShareLink = async () => {
    try {
      setLoading(true);
      
      // Generate random token
      const token = crypto.randomUUID();
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
      
      // Create share record
      const { error } = await supabase
        .from('report_shares')
        .insert({
          report_id: reportId,
          user_id: user?.id || 'anonymous',
          share_token: token,
          expires_at: expiresAt.toISOString(),
          notes: notes.trim() || null
        });

      if (error) throw error;

      // Generate full URL
      const shareUrl = `${window.location.origin}/shared-report/${token}`;
      setShareLink(shareUrl);
      
      toast.success("Share link created successfully!");
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error("Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setShareLink("");
      setNotes("");
      setExpiresIn("7");
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Health Report</DialogTitle>
          <DialogDescription>
            Create a secure, temporary link to share this report with a doctor or healthcare provider.
          </DialogDescription>
        </DialogHeader>

        {!shareLink ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="expires">Link expires in</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for the recipient..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={generateShareLink} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Generate Share Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="share-link">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="icon"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link will expire in {expiresIn} {parseInt(expiresIn) === 1 ? 'day' : 'days'}
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Security Notice:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Anyone with this link can view the report</li>
                <li>The link will automatically expire after {expiresIn} days</li>
                <li>You can revoke access anytime from "Manage Shares"</li>
              </ul>
            </div>

            <Button
              onClick={() => handleOpenChange(false)}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
