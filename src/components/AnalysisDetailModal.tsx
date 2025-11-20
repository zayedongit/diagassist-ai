import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Clock, AlertCircle, User, Calendar, FileText, MessageSquare } from 'lucide-react';

interface Analysis {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  user_id: string;
  filename: string | null;
  admin_alerted: boolean;
  admin_notified_success: boolean;
  admin_notified_at: string | null;
  error_message: string | null;
  error_timestamp: string | null;
  result: any;
  feature_tier: string | null;
  pdf_path: string | null;
  comprehensive_report_path: string | null;
  plan_report_path: string | null;
  exported_to_drive: boolean;
  drive_file_id: string | null;
}

interface AnalysisDetailModalProps {
  analysis: Analysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalysisDetailModal({ analysis, isOpen, onClose }: AnalysisDetailModalProps) {
  if (!analysis) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    });
  };

  const getPatientInfo = () => {
    try {
      if (analysis.result?.demographics) {
        return {
          name: analysis.result.demographics.name || 'Unknown',
          age: analysis.result.demographics.age || 'N/A',
          gender: analysis.result.demographics.gender || 'N/A',
          testDate: analysis.result.demographics.testDate || 'N/A',
        };
      }
      if (analysis.result?.patientName) {
        return {
          name: analysis.result.patientName,
          age: 'N/A',
          gender: 'N/A',
          testDate: 'N/A',
        };
      }
    } catch (e) {
      console.error('Error extracting patient info:', e);
    }
    return { name: 'Unknown', age: 'N/A', gender: 'N/A', testDate: 'N/A' };
  };

  const patientInfo = getPatientInfo();

  const getStatusIcon = () => {
    switch (analysis.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Analysis Details
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Analysis Overview */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Analysis Overview
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Analysis ID:</span>
                  <p className="font-mono text-xs mt-1">{analysis.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <Badge variant={analysis.status === 'completed' ? 'default' : analysis.status === 'failed' ? 'destructive' : 'secondary'}>
                      {analysis.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Feature Tier:</span>
                  <p className="font-medium mt-1">{analysis.feature_tier || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Filename:</span>
                  <p className="font-medium mt-1 truncate">{analysis.filename || 'N/A'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Patient Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Patient Name:</span>
                  <p className="font-medium mt-1">{patientInfo.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Age:</span>
                  <p className="font-medium mt-1">{patientInfo.age}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender:</span>
                  <p className="font-medium mt-1">{patientInfo.gender}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Test Date:</span>
                  <p className="font-medium mt-1">{patientInfo.testDate}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* SMS Notification Status */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Notification Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SMS Sent:</span>
                  <Badge variant={analysis.admin_notified_at ? 'default' : 'secondary'}>
                    {analysis.admin_notified_at ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Yes
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        No
                      </>
                    )}
                  </Badge>
                </div>
                
                {analysis.admin_notified_at && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Notification Type:</span>
                      <Badge variant={analysis.admin_notified_success ? 'default' : 'destructive'}>
                        {analysis.admin_notified_success ? 'Success Alert' : 'Failure Alert'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sent At:</span>
                      <span className="text-sm font-medium">{formatDate(analysis.admin_notified_at)}</span>
                    </div>
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SMS Alert Status:</span>
                  <Badge variant={analysis.admin_alerted ? 'default' : 'outline'}>
                    {analysis.admin_alerted ? 'Delivered' : 'Pending'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recipient:</span>
                  <span className="text-sm font-mono">+91 7993448425</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created At:</span>
                  <span className="font-medium">{formatDate(analysis.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated At:</span>
                  <span className="font-medium">{formatDate(analysis.updated_at)}</span>
                </div>
                {analysis.error_timestamp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error Timestamp:</span>
                    <span className="font-medium text-red-600">{formatDate(analysis.error_timestamp)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Details */}
            {analysis.error_message && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Error Details
                  </h3>
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <p className="text-sm text-red-900 dark:text-red-200 font-mono whitespace-pre-wrap break-words">
                      {analysis.error_message}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Storage & Export Info */}
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-3">Storage & Export</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">PDF Stored:</span>
                  <Badge variant={analysis.pdf_path ? 'default' : 'secondary'}>
                    {analysis.pdf_path ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comprehensive Report:</span>
                  <Badge variant={analysis.comprehensive_report_path ? 'default' : 'secondary'}>
                    {analysis.comprehensive_report_path ? 'Stored' : 'Not Stored'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">30-Day Plan:</span>
                  <Badge variant={analysis.plan_report_path ? 'default' : 'secondary'}>
                    {analysis.plan_report_path ? 'Stored' : 'Not Stored'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Exported to Drive:</span>
                  <Badge variant={analysis.exported_to_drive ? 'default' : 'secondary'}>
                    {analysis.exported_to_drive ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {analysis.drive_file_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Drive File ID:</span>
                    <span className="font-mono text-xs">{analysis.drive_file_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* User ID */}
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2">User ID</h3>
              <p className="font-mono text-xs bg-muted p-2 rounded break-all">{analysis.user_id}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
