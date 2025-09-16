import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, FileText, Stethoscope, Users, Download, AlertCircle } from "lucide-react";
import { ComprehensiveReport } from "@/components/ComprehensiveReport";

interface ClinicalReportData {
  possibleConditions: Array<{ name: string; rationale: string; probability: string; }>;
  investigations: Array<{ test: string; reason: string; urgency: string; }>;
  management: {
    diet: string[];
    lifestyle: string[];
    generalRx: string[];
  };
  referrals: Array<{ specialty: string; reason: string; timeframe: string; }>;
  redFlags: string[];
  disclaimer: string;
}

interface ClinicalReportProps {
  reportData: ClinicalReportData;
  onDownload?: () => void;
  analysisData?: any;
  patientName?: string;
}

const getProbabilityBadgeVariant = (probability: string) => {
  switch (probability.toLowerCase()) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

const getUrgencyBadgeVariant = (urgency: string) => {
  switch (urgency.toLowerCase()) {
    case 'urgent': return 'destructive';
    case 'routine': return 'default';
    case 'optional': return 'secondary';
    default: return 'outline';
  }
};

const getTimeframeBadgeVariant = (timeframe: string) => {
  switch (timeframe.toLowerCase()) {
    case 'urgent': return 'destructive';
    case 'within 2 weeks': return 'default';
    case 'routine': return 'secondary';
    default: return 'outline';
  }
};

export const ClinicalReport = ({ reportData, onDownload, analysisData, patientName }: ClinicalReportProps) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-semibold">Clinical Assessment Report</CardTitle>
          </div>
          {onDownload && (
            <Button onClick={onDownload} variant="outline" size="sm" className="mx-auto">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Red Flags - Show first if any */}
      {reportData.redFlags && reportData.redFlags.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <User className="h-5 w-5" />
              Warning Signs to Watch For
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reportData.redFlags.map((flag, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-destructive font-medium">{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Possible Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-persian-blue">
            <Stethoscope className="h-5 w-5 text-primary" />
            Possible Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.possibleConditions.map((condition, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{condition.name}</h4>
                  <Badge variant={getProbabilityBadgeVariant(condition.probability)}>
                    {condition.probability} Probability
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{condition.rationale}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Investigations */}
      {reportData.investigations && reportData.investigations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recommended Investigations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.investigations.map((investigation, index) => (
                <div key={index} className="flex items-start justify-between border rounded-lg p-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{investigation.test}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{investigation.reason}</p>
                  </div>
                  <Badge variant={getUrgencyBadgeVariant(investigation.urgency)} className="ml-3">
                    {investigation.urgency}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Management Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Diet */}
          {reportData.management.diet && reportData.management.diet.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">Dietary Recommendations</h4>
              <ul className="space-y-2">
                {reportData.management.diet.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lifestyle */}
          {reportData.management.lifestyle && reportData.management.lifestyle.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">Lifestyle Modifications</h4>
              <ul className="space-y-2">
                {reportData.management.lifestyle.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* General Management */}
          {reportData.management.generalRx && reportData.management.generalRx.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">General Management</h4>
              <ul className="space-y-2">
                {reportData.management.generalRx.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referrals */}
      {reportData.referrals && reportData.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Specialist Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.referrals.map((referral, index) => (
                <div key={index} className="flex items-start justify-between border rounded-lg p-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{referral.specialty}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{referral.reason}</p>
                  </div>
                  <Badge variant={getTimeframeBadgeVariant(referral.timeframe)} className="ml-3">
                    {referral.timeframe}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Medical Disclaimer:</strong> {reportData.disclaimer}
          </p>
        </CardContent>
      </Card>

      {/* Download Comprehensive Report Section - Removed to avoid duplication */}
      {/* ComprehensiveReport component handles download functionality */}
    </div>
  );
};