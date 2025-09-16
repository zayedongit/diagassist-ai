import { AlertTriangle, Heart, Activity, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";

interface HealthRisksSectionProps {
  analysisData: EnhancedAnalysisResult | LegacyAnalysisResult;
}

export const HealthRisksSection = ({ analysisData }: HealthRisksSectionProps) => {
  // Check if we have AI-generated health risks data
  const hasAIHealthRisks = 'healthRisks' in analysisData && analysisData.healthRisks && analysisData.healthRisks.length > 0;
  
  // Use AI data if available, otherwise fall back to heuristic analysis
  const getHealthRisks = () => {
    if (hasAIHealthRisks) {
      // Use AI-generated health risks directly - no fallback processing
      console.log('🤖 Using AI-generated health risks:', (analysisData as any).healthRisks.length);
      return (analysisData as any).healthRisks.map((risk: any) => ({
        ...risk,
        icon: risk.category === 'Metabolic' ? Activity : 
              risk.category === 'Hepatic' ? Brain : 
              risk.category === 'Renal' ? Activity : AlertTriangle
      }));
    }
    
    console.log('⚡ Falling back to heuristic health risk analysis');
    // Fallback to heuristic analysis for legacy data
    const risks = [];
    const abnormalLabs: any[] = [];
    
    // Collect all abnormal labs from medical panels - strict filtering for valid numeric values
    if ('medicalPanels' in analysisData && analysisData.medicalPanels) {
      for (const panel of analysisData.medicalPanels) {
        // Skip Additional Findings panels completely
        if (panel.name === 'Additional Findings' || panel.name.toLowerCase().includes('additional')) {
          continue;
        }
        
        if (panel.abnormalLabs) {
          abnormalLabs.push(...panel.abnormalLabs.filter(lab => 
            lab.value !== 'AUTO-DETECTED' && 
            lab.value !== 'See Report' &&
            !isNaN(parseFloat(lab.value)) &&
            parseFloat(lab.value) > 0 &&
            !lab.name.toLowerCase().includes('blood group') &&
            !lab.name.toLowerCase().includes('sample type')
          ));
        }
      }
    } else if ('labs' in analysisData && analysisData.labs) {
      abnormalLabs.push(...analysisData.labs.filter(lab => 
        lab.value !== 'AUTO-DETECTED' && 
        lab.value !== 'See Report' &&
        !isNaN(parseFloat(lab.value)) &&
        parseFloat(lab.value) > 0 &&
        !lab.name.toLowerCase().includes('blood group') &&
        !lab.name.toLowerCase().includes('sample type')
      ));
    }

    // Skip analysis if we don't have any valid abnormal values
    if (abnormalLabs.length === 0) {
      return [];
    }

    // Prioritize diabetes/metabolic risks
    const diabetesLabs = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('glucose') || 
      lab.name.toLowerCase().includes('hba1c') ||
      lab.name.toLowerCase().includes('diabetes')
    );
    
    if (diabetesLabs.length > 0 && diabetesLabs.some(lab => lab.status === 'high' || lab.status === 'critical')) {
      // Check for critical diabetes (HbA1c >9% or glucose >200)
      const criticalDiabetes = diabetesLabs.some(lab => {
        const value = parseFloat(lab.value);
        return (lab.name.toLowerCase().includes('hba1c') && value > 9) ||
               (lab.name.toLowerCase().includes('glucose') && value > 200);
      });
      
      risks.push({
        category: 'Metabolic',
        risk: criticalDiabetes ? 'Severely Uncontrolled Diabetes' : 'Type 2 Diabetes Risk',
        level: criticalDiabetes ? 'high' : 'moderate',
        description: criticalDiabetes 
          ? 'Severely uncontrolled diabetes with high risk of complications affecting eyes, kidneys, nerves, and cardiovascular system.'
          : 'Blood sugar irregularities may progress to type 2 diabetes if not managed properly.',
        icon: Activity
      });
    }
    
    // Analyze liver function values
    const liverLabs = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('alt') || 
      lab.name.toLowerCase().includes('ast') ||
      lab.name.toLowerCase().includes('liver') ||
      lab.name.toLowerCase().includes('bilirubin')
    );
    
    if (liverLabs.length > 0 && liverLabs.some(lab => lab.status === 'high' || lab.status === 'critical')) {
      risks.push({
        category: 'Hepatic',
        risk: 'Liver Function Issues',
        level: liverLabs.some(lab => lab.status === 'critical') ? 'moderate' : 'mild',
        description: 'Elevated liver enzymes may indicate liver stress or inflammation.',
        icon: Brain
      });
    }
    
    // Analyze kidney function values
    const kidneyLabs = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('creatinine') || 
      lab.name.toLowerCase().includes('urea') ||
      lab.name.toLowerCase().includes('kidney')
    );
    
    if (kidneyLabs.length > 0 && kidneyLabs.some(lab => lab.status === 'high' || lab.status === 'critical')) {
      risks.push({
        category: 'Renal',
        risk: 'Kidney Function Decline',
        level: kidneyLabs.some(lab => lab.status === 'critical') ? 'moderate' : 'mild',
        description: 'Changes in kidney function markers may require monitoring and lifestyle adjustments.',
        icon: Activity
      });
    }
    
    // Only add general risk if we have actual concerning abnormal values
    if (risks.length === 0 && analysisData.overallStatus === 'concerning' && abnormalLabs.length > 0) {
      risks.push({
        category: 'General',
        risk: 'Multiple Parameter Abnormalities',
        level: 'moderate' as const,
        description: 'Several lab values are outside normal ranges, requiring medical attention and monitoring.',
        icon: AlertTriangle
      });
    }
    
    return risks;
  };

  const healthRisks = getHealthRisks();

  if (healthRisks.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-success">
            <Heart className="w-5 h-5" />
            <span>Health Risks Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-success/5 rounded-lg p-4 border border-success/20">
            <p className="text-sm text-foreground">
              <strong>Good news!</strong> Based on your current results, no significant health risks were identified. 
              Continue maintaining your current healthy lifestyle.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'mild':
        return 'secondary';
      case 'moderate':
        return 'destructive';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <span>Health Risks Identified</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {healthRisks.map((risk, index) => {
            const RiskIcon = risk.icon;
            return (
              <div key={index} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                <div className="flex items-start space-x-3">
                  <div className="bg-destructive/10 p-2 rounded-full flex-shrink-0">
                    <RiskIcon className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{risk.risk}</h4>
                      <Badge variant={getRiskBadgeVariant(risk.level)}>
                        {risk.level} risk
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Category: {risk.category}
                    </p>
                    <p className="text-sm text-foreground">
                      {risk.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Disclaimer */}
        <div className="mt-4 p-3 bg-muted/10 rounded-lg border border-border/20">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> This risk assessment is based on current lab values and general medical knowledge. 
            Individual risk factors vary, and these are not diagnostic statements. Please consult with your healthcare 
            provider for personalized risk assessment and management.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};