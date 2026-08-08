import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Heart, Activity, AlertCircle, CheckCircle2, TrendingUp, Shield } from "lucide-react";
import { EnhancedAnalysisResult, Demographics } from "@/types/medicalAnalysis";
import { calculateHealthRisks, HealthRiskCalculation } from "@/utils/healthRiskCalculator";
import { RiskPredictionTimeline } from "@/components/RiskPredictionTimeline";
import { ClinicalContext } from "@/utils/parseClinicalContext";

interface HealthRiskDashboardProps {
  analysisData: EnhancedAnalysisResult;
  demographics?: Demographics;
  clinicalContext?: ClinicalContext;
}

export const HealthRiskDashboard = ({ analysisData, demographics, clinicalContext }: HealthRiskDashboardProps) => {
  const riskCalculation: HealthRiskCalculation = calculateHealthRisks(analysisData, demographics, clinicalContext);
  
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'very-high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-white/60 bg-white/[0.03] border-white/10';
    }
  };
  
  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'low': return 'outline';
      case 'moderate': return 'secondary';
      case 'high': return 'default';
      case 'very-high': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'moderate': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'high': return <TrendingUp className="w-5 h-5 text-orange-600" />;
      case 'very-high': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Shield className="w-5 h-5 text-white/60" />;
    }
  };
  
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-white/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              Personalized Health Risk Calculator
            </CardTitle>
            <CardDescription>
              Comprehensive risk assessment based on all your lab values
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Risk Summary */}
        <Alert className={`${getRiskColor(riskCalculation.overallRiskLevel)} border-2`}>
          <div className="flex items-start gap-3">
            {getRiskIcon(riskCalculation.overallRiskLevel)}
            <div className="flex-1">
              <AlertTitle className="text-base font-semibold mb-1">
                Overall Risk Level: {riskCalculation.overallRiskLevel.toUpperCase().replace('-', ' ')}
              </AlertTitle>
              <AlertDescription className="text-sm">
                Based on comprehensive analysis of cardiovascular, diabetes, and metabolic syndrome risk factors
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        {/* Cardiovascular Risk */}
        <div className="bg-white/60 rounded-lg p-4 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-white">Cardiovascular Disease Risk</h3>
            </div>
            <Badge variant={getRiskBadgeVariant(riskCalculation.cardiovascularRisk.level)}>
              {riskCalculation.cardiovascularRisk.level.toUpperCase().replace('-', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Risk Score</span>
              <span className="font-semibold text-white">{riskCalculation.cardiovascularRisk.score}/100</span>
            </div>
            <Progress 
              value={riskCalculation.cardiovascularRisk.score} 
              className="h-2"
            />
          </div>
          
          <p className="text-sm text-white/90 bg-white/5 p-3 rounded border border-white/10">
            {riskCalculation.cardiovascularRisk.description}
          </p>
          
          {riskCalculation.cardiovascularRisk.contributingFactors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Contributing Factors:</h4>
              <ul className="space-y-1">
                {riskCalculation.cardiovascularRisk.contributingFactors.map((factor, index) => (
                  <li key={index} className="text-sm text-white/90 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Diabetes Risk */}
        <div className="bg-white/60 rounded-lg p-4 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-white">Type 2 Diabetes Risk</h3>
            </div>
            <Badge variant={getRiskBadgeVariant(riskCalculation.diabetesRisk.level)}>
              {riskCalculation.diabetesRisk.level.toUpperCase().replace('-', ' ')}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Risk Score</span>
              <span className="font-semibold text-white">{riskCalculation.diabetesRisk.score}/100</span>
            </div>
            <Progress 
              value={riskCalculation.diabetesRisk.score} 
              className="h-2"
            />
          </div>
          
          <p className="text-sm text-white/90 bg-white/5 p-3 rounded border border-white/10">
            {riskCalculation.diabetesRisk.description}
          </p>
          
          {riskCalculation.diabetesRisk.contributingFactors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Contributing Factors:</h4>
              <ul className="space-y-1">
                {riskCalculation.diabetesRisk.contributingFactors.map((factor, index) => (
                  <li key={index} className="text-sm text-white/90 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Metabolic Syndrome Assessment */}
        <div className={`bg-white/60 rounded-lg p-4 border-2 ${
          riskCalculation.metabolicSyndrome.hasSyndrome 
            ? 'border-red-300 bg-red-50/50' 
            : 'border-green-300 bg-green-50/50'
        } space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-white">Metabolic Syndrome Assessment</h3>
            </div>
            <Badge variant={riskCalculation.metabolicSyndrome.hasSyndrome ? 'destructive' : 'outline'}>
              {riskCalculation.metabolicSyndrome.hasSyndrome ? 'LIKELY PRESENT' : 'NOT PRESENT'}
            </Badge>
          </div>
          
          <div className="bg-white/5 p-3 rounded border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Lab Criteria Met</span>
              <span className="text-lg font-bold text-white">
                {riskCalculation.metabolicSyndrome.criteriaCount}/3
              </span>
            </div>
            <Progress 
              value={(riskCalculation.metabolicSyndrome.criteriaCount / 3) * 100} 
              className="h-2"
            />
            <p className="text-xs text-white/60 mt-2">
              ≥3 criteria needed for diagnosis (from lab values only)
            </p>
          </div>
          
          <p className="text-sm text-white/90 bg-white/5 p-3 rounded border border-white/10">
            {riskCalculation.metabolicSyndrome.description}
          </p>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Diagnostic Criteria:</h4>
            <div className="space-y-2">
              {riskCalculation.metabolicSyndrome.criteria.map((criterion, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-3 p-2 rounded ${
                    criterion.met ? 'bg-red-50 border border-red-200' : 'bg-white/[0.03] border border-white/10'
                  }`}
                >
                  {criterion.met ? (
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{criterion.name}</p>
                    <p className="text-xs text-white/60">
                      {criterion.value} {criterion.threshold && `(threshold: ${criterion.threshold})`}
                    </p>
                  </div>
                  <Badge variant={criterion.met ? 'destructive' : 'outline'} className="text-xs">
                    {criterion.met ? 'Criterion Exceeded' : 'Within Normal Range'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Important Note */}
        <Alert className="bg-white/5 border-white/10">
          <AlertCircle className="h-4 w-4 text-white/80" />
          <AlertTitle className="text-sm font-semibold text-blue-900">Important Note</AlertTitle>
          <AlertDescription className="text-xs text-blue-800">
            These risk assessments are based on laboratory values and available demographic information. 
            They should be interpreted by a healthcare professional who can consider additional factors like 
            family history, smoking status, blood pressure, waist circumference, and physical activity levels. 
            This tool is for educational purposes and does not replace professional medical advice.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

// Export with Timeline wrapper component for easy integration
export const HealthRiskDashboardWithTimeline = ({ 
  analysisData, 
  demographics, 
  clinicalContext 
}: { 
  analysisData: EnhancedAnalysisResult; 
  demographics?: Demographics;
  clinicalContext?: ClinicalContext;
}) => {
  const riskCalculation = calculateHealthRisks(analysisData, demographics, clinicalContext);
  
  return (
    <div className="space-y-6">
      <HealthRiskDashboard 
        analysisData={analysisData} 
        demographics={demographics}
        clinicalContext={clinicalContext}
      />
      <RiskPredictionTimeline 
        cardiovascularRisk={riskCalculation.cardiovascularRisk}
        diabetesRisk={riskCalculation.diabetesRisk}
        clinicalContext={clinicalContext}
      />
    </div>
  );
};
