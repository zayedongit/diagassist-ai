import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Clock, Home, Eye } from "lucide-react";
import { MobileResultsView } from "@/components/MobileResultsView";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SharedReport() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  useEffect(() => {
    if (token) {
      validateAndFetchReport();
    }
  }, [token]);

  const validateAndFetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('validate-report-share', {
        body: { token }
      });

      if (error) throw error;

      if (data.error) {
        setError(data.error);
        return;
      }

      setReportData(data.report);
      setShareInfo(data.shareInfo);
    } catch (err) {
      console.error('Error validating share:', err);
      setError('Failed to load shared report. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Loading Report...</h3>
                <p className="text-sm text-muted-foreground">
                  Validating share link and fetching report data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Unable to load report</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This could happen if:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>The link has expired</li>
                <li>The link has been revoked</li>
                <li>The link is invalid or malformed</li>
              </ul>
            </div>

            <Button
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="bg-primary/10 border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Shared Health Report</h1>
                <p className="text-sm text-muted-foreground">
                  Securely shared via temporary link
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Share Info Alert */}
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">This report was shared with you</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Shared on {format(new Date(shareInfo.created_at), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires on {format(new Date(shareInfo.expires_at), 'MMM d, yyyy')}
                </span>
                <span>
                  Views: {shareInfo.access_count}
                </span>
              </div>
              {shareInfo.notes && (
                <p className="text-sm mt-2 italic">
                  Note: {shareInfo.notes}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Report Content */}
      <div className="container max-w-6xl mx-auto px-4 pb-8">
        <MobileResultsView 
          analysisData={reportData.result}
          enhancedData={null}
          clinicalAssessmentData={null}
          onClinicalAssessmentComplete={() => {}}
          onDownloadReport={() => toast.info("Download not available for shared reports")}
          onPreviewReport={() => {}}
          onDismiss={() => navigate('/')}
        />
      </div>
    </div>
  );
}
