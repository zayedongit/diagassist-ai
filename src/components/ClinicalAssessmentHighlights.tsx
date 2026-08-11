import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Stethoscope, Users, FileText, Activity, Heart } from "lucide-react";

interface ClinicalAssessmentHighlightsProps {
  clinicalData?: any;
  analysisData?: any;
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

export const ClinicalAssessmentHighlights = ({ clinicalData, analysisData }: ClinicalAssessmentHighlightsProps) => {
  // Filter out clinically inappropriate warning signs
  const filterClinicallyAppropriateRedFlags = (redFlags: string[]): string[] => {
    if (!redFlags || redFlags.length === 0) return [];
    
    // Check if patient has actual anemia
    let hgbValue: number | null = null;
    if (analysisData?.medicalPanels) {
      for (const panel of analysisData.medicalPanels) {
        if (panel.name.toLowerCase().includes('cbc') || 
            panel.name.toLowerCase().includes('haematology') ||
            panel.name.toLowerCase().includes('hematology')) {
          const allLabs = [...(panel.labs || []), ...(panel.abnormalLabs || [])];
          const hgbLab = allLabs.find((lab: any) =>
            lab.name.toLowerCase().includes('hemoglobin') ||
            lab.name.toLowerCase().includes('haemoglobin')
          );
          if (hgbLab) {
            hgbValue = parseFloat(hgbLab.value);
            break;
          }
        }
      }
    }
    
    // Filter out anemia-related warning signs if Hgb is normal
    if (hgbValue !== null && hgbValue >= 11.5) {
      console.log(`[WARNING FILTER] Hgb is ${hgbValue} g/dL (NORMAL) - Filtering out anemia warning signs`);
      return redFlags.filter(flag => {
        const lower = flag.toLowerCase();
        // Remove anemia-specific emergency symptoms
        const isAnemiaSymptom = (
          lower.includes('tarry') ||
          lower.includes('bloody stool') ||
          lower.includes('black stool') ||
          lower.includes('chest pain') ||
          lower.includes('palpitation') ||
          lower.includes('shortness of breath') ||
          lower.includes('severe fatigue') ||
          lower.includes('severe dizziness') ||
          lower.includes('fainting') ||
          lower.includes('gi bleeding')
        );
        
        if (isAnemiaSymptom) {
          console.log(`[WARNING FILTER] Removed inappropriate warning: "${flag}"`);
          return false;
        }
        return true;
      });
    }
    
    // For severe cases (Hgb < 8), keep all warning signs
    if (hgbValue !== null && hgbValue < 8) {
      console.log(`[WARNING FILTER] Hgb is ${hgbValue} g/dL (SEVERE) - Keeping all warnings`);
      return redFlags;
    }
    
    // For moderate cases (Hgb 8-11), keep but limit to most relevant
    if (hgbValue !== null && hgbValue < 11.5) {
      console.log(`[WARNING FILTER] Hgb is ${hgbValue} g/dL (MODERATE) - Limiting warnings`);
      return redFlags.slice(0, 3);
    }
    
    return redFlags;
  };

  // Don't show anything if clinical assessment is not completed
  if (!clinicalData) {
    return null;
  }
  
  // Apply clinical filtering to red flags
  const filteredRedFlags = clinicalData.redFlags 
    ? filterClinicallyAppropriateRedFlags(clinicalData.redFlags)
    : [];

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
            <div className="bg-card rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-persian-blue text-center py-4">
                Complete the clinical assessment chat above to see personalized warning signs and possible conditions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Investigations Placeholder */}
        <Card className="border-white/10 bg-gradient-to-br from-white/5 to-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5" />
              Investigations & Specialist Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-card rounded-lg p-4 border border-white/10">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Side by side cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Warning Signs to Look For */}
        <Card className="border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg lg:text-xl">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600" />
              Warning Signs to Look For
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0">
            {/* Red Flags */}
            {clinicalData.redFlags && clinicalData.redFlags.length > 0 && (
              <div className="bg-warning/15 rounded-lg p-2.5 sm:p-3 border border-warning/40">
                <h4 className="font-medium text-foreground mb-1.5 sm:mb-2 flex items-center gap-1 text-sm sm:text-base">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning-600" />
                  Immediate Warning Signs
                </h4>
                <ul className="space-y-1 sm:space-y-1.5">
                  {clinicalData.redFlags.slice(0, 3).map((flag: string, index: number) => (
                    <li key={index} className="text-xs sm:text-sm text-foreground flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-warning-600 mt-2 flex-shrink-0"></span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Possible Conditions */}
            {clinicalData.possibleConditions && clinicalData.possibleConditions.length > 0 && (
              <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-warning/30">
                <h4 className="font-medium text-foreground mb-1.5 sm:mb-2 flex items-center gap-1 text-sm sm:text-base">
                  <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Possible Conditions
                </h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {clinicalData.possibleConditions.slice(0, 2).map((condition: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-foreground font-medium">{condition.name}</span>
                      <Badge variant={getProbabilityBadgeVariant(condition.probability)} className="text-[10px] sm:text-xs">
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
        <Card className="border-white/10 bg-gradient-to-br from-white/5 to-white/5">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg lg:text-xl">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Investigations & Specialist Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0">
            {/* Investigations */}
            {clinicalData.investigations && clinicalData.investigations.length > 0 && (
              <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-white/10">
                <h4 className="font-medium text-foreground mb-1.5 sm:mb-2 flex items-center gap-1 text-sm sm:text-base">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Recommended Tests
                </h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {clinicalData.investigations.slice(0, 2).map((investigation: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-foreground font-medium">{investigation.test}</span>
                      <Badge variant={getUrgencyBadgeVariant(investigation.urgency)} className="text-[10px] sm:text-xs">
                        {investigation.urgency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialist Referrals */}
            {clinicalData.referrals && clinicalData.referrals.length > 0 && (
              <div className="bg-card rounded-lg p-3 border border-primary/20">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4 text-primary" />
                  Specialist Referrals
                </h4>
                <div className="space-y-2">
                  {clinicalData.referrals.slice(0, 2).map((referral: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-medium">{referral.specialty}</span>
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
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Heart className="w-5 h-5 text-green-600" />
              Management Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Diet */}
              {clinicalData.management.diet && clinicalData.management.diet.length > 0 && (
                <div className="bg-card rounded-lg p-3 border border-green-200">
                <h5 className="font-medium text-foreground mb-2">Dietary</h5>
                <ul className="space-y-1">
                  {clinicalData.management.diet.slice(0, 3).map((item: string, index: number) => (
                    <li key={index} className="text-sm text-foreground flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                  </ul>
                </div>
              )}

              {/* Lifestyle */}
              {clinicalData.management.lifestyle && clinicalData.management.lifestyle.length > 0 && (
                <div className="bg-card rounded-lg p-3 border border-green-200">
                <h5 className="font-medium text-foreground mb-2">Lifestyle</h5>
                <ul className="space-y-1">
                  {clinicalData.management.lifestyle.slice(0, 3).map((item: string, index: number) => (
                    <li key={index} className="text-sm text-foreground flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                  </ul>
                </div>
              )}

              {/* General Management */}
              {clinicalData.management.generalRx && clinicalData.management.generalRx.length > 0 && (
                <div className="bg-card rounded-lg p-3 border border-green-200">
                <h5 className="font-medium text-foreground mb-2">General</h5>
                <ul className="space-y-1">
                  {clinicalData.management.generalRx.slice(0, 3).map((item: string, index: number) => (
                    <li key={index} className="text-sm text-foreground flex items-start gap-1">
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