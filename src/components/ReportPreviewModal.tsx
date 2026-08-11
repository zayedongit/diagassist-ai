import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Activity, Utensils, Heart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PatientInfo {
  name?: string;
  age?: number;
  gender?: string;
  testDate?: string;
}

interface LabParameter {
  parameter: string;
  value: number | string;
  unit: string;
  normalRange: string;
  status: 'high' | 'low' | 'normal';
}

interface ReportData {
  patientInfo?: PatientInfo;
  overallStatus?: string;
  summary?: string;
  abnormalLabs?: LabParameter[];
  actionItems?: string[];
  dietaryRecommendations?: {
    toAdd?: string[];
    toLimitOrAvoid?: string[];
  };
  lifestyleModifications?: string[];
  followUpGuidance?: string;
}

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportData;
  onDownload: () => void;
}

export function ReportPreviewModal({ open, onOpenChange, reportData, onDownload }: ReportPreviewModalProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'normal':
      case 'good':
        return 'bg-green-500';
      case 'concerning':
      case 'moderate':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-card/[0.03]0';
    }
  };

  const getLabStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'low':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-foreground bg-card/[0.03]';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5" />
            Essential Health Report Preview
          </DialogTitle>
          <DialogDescription>
            Review your report before downloading (2-page PDF format)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Patient Information */}
            {reportData.patientInfo && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Patient Information</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{reportData.patientInfo.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Age:</span>
                      <p className="font-medium">{reportData.patientInfo.age ? `${reportData.patientInfo.age}y` : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>
                      <p className="font-medium">{reportData.patientInfo.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Test Date:</span>
                      <p className="font-medium">{reportData.patientInfo.testDate || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Status */}
            {reportData.overallStatus && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Overall Status:</span>
                <Badge className={`${getStatusColor(reportData.overallStatus)} text-foreground`}>
                  {reportData.overallStatus.toUpperCase()}
                </Badge>
              </div>
            )}

            {/* Summary */}
            {reportData.summary && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {reportData.summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Abnormal Labs Table */}
            {reportData.abnormalLabs && reportData.abnormalLabs.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Key Lab Results (Abnormal)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-semibold">Parameter</th>
                          <th className="text-left py-2 px-2 font-semibold">Value</th>
                          <th className="text-left py-2 px-2 font-semibold">Normal Range</th>
                          <th className="text-left py-2 px-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.abnormalLabs.slice(0, 8).map((lab, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                            <td className="py-2 px-2">{lab.parameter}</td>
                            <td className="py-2 px-2 font-medium">{lab.value} {lab.unit}</td>
                            <td className="py-2 px-2 text-muted-foreground">{lab.normalRange}</td>
                            <td className="py-2 px-2">
                              <Badge variant="outline" className={getLabStatusColor(lab.status)}>
                                {lab.status.toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {reportData.actionItems && reportData.actionItems.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-900">
                    <span className="text-lg">🎯</span>
                    Immediate Action Items
                  </h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    {reportData.actionItems.slice(0, 5).map((item, index) => (
                      <li key={index} className="text-sm text-red-900">{item}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Dietary Recommendations */}
            {reportData.dietaryRecommendations && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
                    <Utensils className="w-4 h-4" />
                    Dietary Changes
                  </h3>
                  <div className="space-y-3">
                    {reportData.dietaryRecommendations.toAdd && reportData.dietaryRecommendations.toAdd.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2 text-green-900">Add to Diet:</p>
                        <ul className="space-y-1">
                          {reportData.dietaryRecommendations.toAdd.slice(0, 3).map((item, index) => (
                            <li key={index} className="text-sm text-green-800 ml-4">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reportData.dietaryRecommendations.toLimitOrAvoid && reportData.dietaryRecommendations.toLimitOrAvoid.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2 text-green-900">Limit or Avoid:</p>
                        <ul className="space-y-1">
                          {reportData.dietaryRecommendations.toLimitOrAvoid.slice(0, 3).map((item, index) => (
                            <li key={index} className="text-sm text-green-800 ml-4">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lifestyle Modifications */}
            {reportData.lifestyleModifications && reportData.lifestyleModifications.length > 0 && (
              <Card className="border-white/10 bg-card">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-900">
                    <Heart className="w-4 h-4" />
                    Lifestyle Modifications
                  </h3>
                  <ul className="space-y-2">
                    {reportData.lifestyleModifications.slice(0, 4).map((item, index) => (
                      <li key={index} className="text-sm text-blue-900 ml-4">• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Follow-up Guidance */}
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-900">
                  <span className="text-lg">📅</span>
                  Follow-Up
                </h3>
                <p className="text-sm text-yellow-900">
                  {reportData.followUpGuidance || 'Retest recommended in 3-6 months. Consult your healthcare provider if symptoms worsen.'}
                </p>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground italic">
                <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute medical advice. 
                Always consult with a qualified healthcare professional for medical diagnosis and treatment.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={onDownload}
            className="flex-1 gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
