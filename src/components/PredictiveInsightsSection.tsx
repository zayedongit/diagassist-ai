import { TrendingUp, Calendar, Target, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";

interface PredictiveInsightsSectionProps {
  analysisData: EnhancedAnalysisResult | LegacyAnalysisResult;
}

export const PredictiveInsightsSection = ({ analysisData }: PredictiveInsightsSectionProps) => {
  // Check if we have AI-generated predictive insights data
  const hasAIPredictiveInsights = 'predictiveInsights' in analysisData && analysisData.predictiveInsights && analysisData.predictiveInsights.length > 0;
  
  // Use AI data if available, otherwise fall back to heuristic analysis
  const getPredictiveInsights = () => {
    if (hasAIPredictiveInsights) {
      // Use AI-generated predictive insights directly - no fallback processing
      console.log('🤖 Using AI-generated predictive insights:', (analysisData as any).predictiveInsights.length);
      return (analysisData as any).predictiveInsights.map((insight: any) => ({
        ...insight,
        icon: insight.parameter === 'Blood Sugar Control' ? Target :
              insight.parameter === 'Liver Function' ? Calendar :
              insight.parameter === 'Overall Health' ? TrendingUp : TrendingUp
      }));
    }
    
    console.log('⚡ Falling back to heuristic predictive analysis');
    // Fallback to heuristic analysis for legacy data
    const insights = [];
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
      // Only show good health insight if overall status is actually good
      if (analysisData.overallStatus === 'good') {
        insights.push({
          parameter: 'Overall Health',
          currentTrend: 'Stable',
          timeframe: '12 months',
          prediction: 'Current health markers suggest continued good health with proper maintenance.',
          intervention: 'Maintaining current lifestyle should preserve optimal health status.',
          icon: TrendingUp,
          urgency: 'none'
        });
      }
      return insights;
    }

    // Prioritize glucose/diabetes markers - check for severe cases
    const glucoseLabs = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('glucose') || 
      lab.name.toLowerCase().includes('hba1c')
    );
    
    if (glucoseLabs.length > 0 && glucoseLabs.some(lab => lab.status === 'high' || lab.status === 'critical')) {
      // Check for critical diabetes values
      const criticalDiabetes = glucoseLabs.some(lab => {
        const value = parseFloat(lab.value);
        return (lab.name.toLowerCase().includes('hba1c') && value > 9) ||
               (lab.name.toLowerCase().includes('glucose') && value > 200);
      });
      
      insights.push({
        parameter: 'Blood Sugar Control',
        currentTrend: criticalDiabetes ? 'Severely Uncontrolled' : 'Borderline High',
        timeframe: criticalDiabetes ? '1-3 months' : '3-6 months',
        prediction: criticalDiabetes 
          ? 'Immediate risk of diabetic complications including eye damage, kidney problems, and nerve damage. Current levels indicate existing diabetes requiring urgent treatment.'
          : `Current glucose levels suggest ${glucoseLabs.some(lab => lab.status === 'critical') ? '40-60%' : '20-30%'} increased risk of developing pre-diabetes within 2 years.`,
        intervention: criticalDiabetes
          ? 'Immediate medical intervention with medication, strict dietary control, and monitoring could reduce HbA1c by 2-4% within 3 months.'
          : `Weight management and dietary changes could normalize levels within ${glucoseLabs.some(lab => lab.status === 'critical') ? '3-6' : '2-4'} months.`,
        icon: Target,
        urgency: criticalDiabetes ? 'moderate' : 'mild'
      });
    }
    
    // Analyze liver function
    const liverLabs = abnormalLabs.filter(lab => 
      lab.name.toLowerCase().includes('alt') || 
      lab.name.toLowerCase().includes('ast') ||
      lab.name.toLowerCase().includes('bilirubin')
    );
    
    if (liverLabs.length > 0 && liverLabs.some(lab => lab.status === 'high' || lab.status === 'critical')) {
      insights.push({
        parameter: 'Liver Function',
        currentTrend: 'Mild Elevation',
        timeframe: '2-4 months',
        prediction: 'Liver enzymes may continue to rise if underlying causes are not addressed.',
        intervention: 'Lifestyle modifications could normalize enzyme levels within 6-8 weeks.',
        icon: Calendar,
        urgency: 'mild'
      });
    }
    
    // Only show good health message if truly good status and no concerning abnormal values
    if (insights.length === 0 && analysisData.overallStatus === 'good') {
      insights.push({
        parameter: 'Overall Health',
        currentTrend: 'Stable',
        timeframe: '12 months',
        prediction: 'Current health markers suggest continued good health with proper maintenance.',
        intervention: 'Maintaining current lifestyle should preserve optimal health status.',
        icon: TrendingUp,
        urgency: 'none'
      });
    }
    
    return insights;
  };

  const insights = getPredictiveInsights();

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'none':
        return 'text-success';
      case 'mild':
        return 'text-warning';
      case 'moderate':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'none':
        return 'secondary';
      case 'mild':
        return 'outline';
      case 'moderate':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary">
          <TrendingUp className="w-5 h-5" />
          <span>Predictive Health Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const InsightIcon = insight.icon;
            return (
              <div key={index} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                <div className="flex items-start space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                    <InsightIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{insight.parameter}</h4>
                      <Badge variant={getUrgencyBadge(insight.urgency)}>
                        {insight.timeframe}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-muted-foreground">Current:</span>
                        <span className={`text-sm font-medium ${getUrgencyColor(insight.urgency)}`}>
                          {insight.currentTrend}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Prediction:</span>
                        <p className="text-sm text-foreground mt-1">{insight.prediction}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">With Intervention:</span>
                        <p className="text-sm text-success mt-1">{insight.intervention}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Important Disclaimer */}
        <div className="mt-6 p-4 bg-warning/5 rounded-lg border border-warning/20">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-semibold text-warning mb-1">Important Disclaimer</h5>
              <p className="text-xs text-muted-foreground">
                These predictions are statistical estimates based on current lab values and general population data. 
                Individual outcomes may vary significantly due to genetics, lifestyle changes, medical interventions, 
                and other factors. This information is for educational purposes only and should not replace 
                professional medical advice, diagnosis, or treatment. Always consult your healthcare provider 
                for personalized health assessments and treatment plans.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};