import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Stethoscope, Users, FileText, Activity, Heart } from "lucide-react";

interface ClinicalAssessmentHighlightsProps {
  clinicalData?: any;
}

const getProbabilityBadgeVariant = (probability: string) => {
  switch (probability?.toLowerCase()) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

const getUrgencyBadgeVariant = (urgency: string) => {
  switch (urgency?.toLowerCase()) {
    case 'urgent': return 'destructive';
    case 'essential': return 'destructive';
    case 'recommended': return 'default';
    case 'routine': return 'secondary';
    default: return 'outline';
  }
};

export const ClinicalAssessmentHighlights = ({ clinicalData }: ClinicalAssessmentHighlightsProps) => {
  // Don't show anything if clinical assessment is not completed
  if (!clinicalData) {
    return null;
  }

  // Legacy fallback for older data structure
  if (clinicalData && !clinicalData.redFlags && !clinicalData.possibleConditions && !clinicalData.investigations) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warning Signs Placeholder */}
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-5 h-5" />
              Warning Signs & Possible Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white/60 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-persian-blue text-center py-4">
                Complete the clinical assessment chat above to see personalized warning signs and possible conditions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Investigations Placeholder */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <FileText className="w-5 h-5" />
              Investigations & Specialist Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-persian-blue text-center py-4">
                Clinical assessment will provide specific investigation recommendations and specialist referrals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Side by side cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warning Signs to Look For */}
        <Card className="border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Warning Signs to Look For
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Red Flags */}
            {clinicalData.redFlags && clinicalData.redFlags.length > 0 && (
              <div className="bg-warning/15 rounded-lg p-3 border border-warning/40">
                <h4 className="font-medium text-persian-blue mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Immediate Warning Signs
                </h4>
                <ul className="space-y-1">
                  {clinicalData.redFlags.slice(0, 3).map((flag: string, index: number) => (
                    <li key={index} className="text-sm text-persian-blue flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-warning mt-2 flex-shrink-0"></span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Possible Conditions */}
            {clinicalData.possibleConditions && clinicalData.possibleConditions.length > 0 && (
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-warning/30">
                <h4 className="font-medium text-persian-blue mb-2 flex items-center gap-1">
                  <Stethoscope className="w-4 h-4 text-persian-blue" />
                  Possible Conditions
                </h4>
                <div className="space-y-2">
                  {clinicalData.possibleConditions.slice(0, 2).map((condition: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-persian-blue font-medium">{condition.name}</span>
                      <Badge variant={getProbabilityBadgeVariant(condition.probability)} className="text-xs">
                        {condition.probability}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investigations & Specialist Referrals */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <FileText className="w-5 h-5" />
              Investigations & Specialist Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Investigations */}
            {clinicalData.investigations && clinicalData.investigations.length > 0 && (
              <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
                <h4 className="font-medium text-persian-blue mb-2 flex items-center gap-1">
                  <Activity className="w-4 h-4 text-persian-blue" />
                  Recommended Tests
                </h4>
                <div className="space-y-2">
                  {clinicalData.investigations.slice(0, 2).map((investigation: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-persian-blue font-medium">{investigation.test}</span>
                      <Badge variant={getUrgencyBadgeVariant(investigation.urgency)} className="text-xs">
                        {investigation.urgency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialist Referrals */}
            {clinicalData.referrals && clinicalData.referrals.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <h4 className="font-medium text-persian-blue mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4 text-persian-blue" />
                  Specialist Referrals
                </h4>
                <div className="space-y-2">
                  {clinicalData.referrals.slice(0, 2).map((referral: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-persian-blue font-medium">{referral.specialty}</span>
                      <Badge variant="outline" className="text-xs">
                        {referral.timeframe}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Management Recommendations - Full Width */}
      {clinicalData.management && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Heart className="w-5 h-5" />
              Management Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Diet */}
              {clinicalData.management.diet && clinicalData.management.diet.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                  <h5 className="font-medium text-persian-blue mb-2">Dietary</h5>
                  <ul className="space-y-1">
                    {clinicalData.management.diet.slice(0, 3).map((item: string, index: number) => (
                      <li key={index} className="text-sm text-persian-blue flex items-start gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lifestyle */}
              {clinicalData.management.lifestyle && clinicalData.management.lifestyle.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                  <h5 className="font-medium text-persian-blue mb-2">Lifestyle</h5>
                  <ul className="space-y-1">
                    {clinicalData.management.lifestyle.slice(0, 3).map((item: string, index: number) => (
                      <li key={index} className="text-sm text-persian-blue flex items-start gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General Management */}
              {clinicalData.management.generalRx && clinicalData.management.generalRx.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                  <h5 className="font-medium text-persian-blue mb-2">General</h5>
                  <ul className="space-y-1">
                    {clinicalData.management.generalRx.slice(0, 3).map((item: string, index: number) => (
                      <li key={index} className="text-sm text-persian-blue flex items-start gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};