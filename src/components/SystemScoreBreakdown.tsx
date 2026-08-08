import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HealthScoreBreakdown, SystemScore } from "@/utils/healthScoreCalculator";
import { Heart, Activity, Droplet, Leaf, Zap, TrendingUp, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface SystemScoreBreakdownProps {
  breakdown: HealthScoreBreakdown;
}

const getSystemIcon = (systemName: string) => {
  const icons: Record<string, any> = {
    metabolic: Zap,
    cardiovascular: Heart,
    kidney: Droplet,
    liver: Leaf,
    hematologic: Activity,
    endocrine: TrendingUp
  };
  return icons[systemName] || Activity;
};

const getSystemLabel = (systemName: string): string => {
  const labels: Record<string, string> = {
    metabolic: 'Metabolic Health',
    cardiovascular: 'Cardiovascular Health',
    kidney: 'Kidney Function',
    liver: 'Liver Function',
    hematologic: 'Blood Health',
    endocrine: 'Endocrine Function'
  };
  return labels[systemName] || systemName;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'optimal':
    case 'good':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'borderline':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'abnormal':
    case 'critical':
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-white/60" />;
  }
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    optimal: { label: 'Optimal', variant: 'default' },
    good: { label: 'Good', variant: 'default' },
    borderline: { label: 'Borderline', variant: 'secondary' },
    abnormal: { label: 'Abnormal', variant: 'outline' },
    critical: { label: 'Critical', variant: 'destructive' }
  };
  
  const config = variants[status] || { label: status, variant: 'outline' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getSystemRecommendations = (systemName: string, systemData: SystemScore): string[] => {
  const recommendations: Record<string, string[]> = {
    metabolic: [
      'Monitor blood sugar levels regularly',
      'Follow a low-glycemic diet',
      'Exercise at least 150 minutes per week',
      'Maintain healthy body weight'
    ],
    cardiovascular: [
      'Reduce saturated fat intake',
      'Increase omega-3 fatty acids (fish, nuts)',
      'Exercise regularly (cardio + strength)',
      'Manage stress through meditation or yoga'
    ],
    kidney: [
      'Stay well-hydrated (8-10 glasses water daily)',
      'Limit sodium intake (<2300mg/day)',
      'Monitor blood pressure regularly',
      'Avoid NSAIDs unless prescribed'
    ],
    liver: [
      'Limit alcohol consumption',
      'Maintain healthy weight',
      'Avoid unnecessary medications',
      'Consider liver-supporting foods (leafy greens, garlic)'
    ],
    hematologic: [
      'Ensure adequate iron intake',
      'Consume vitamin B12 and folate-rich foods',
      'Stay hydrated',
      'Regular blood work monitoring'
    ],
    endocrine: [
      'Get adequate sleep (7-9 hours)',
      'Manage stress levels',
      'Ensure sufficient iodine intake',
      'Get regular sun exposure or vitamin D supplementation'
    ]
  };
  
  return systemData.score < 70 ? recommendations[systemName] || [] : [];
};

export const SystemScoreBreakdown = ({ breakdown }: SystemScoreBreakdownProps) => {
  const { systemScores } = breakdown;

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-white/90 text-lg">Detailed System Analysis</h4>
      
      <Accordion type="multiple" className="w-full space-y-2">
        {Object.entries(systemScores).map(([systemName, systemData]: [string, SystemScore]) => {
          const Icon = getSystemIcon(systemName);
          const systemRecommendations = getSystemRecommendations(systemName, systemData);
          
          return (
            <AccordionItem 
              key={systemName} 
              value={systemName}
              className="border border-white/10 rounded-lg px-4 bg-white/5"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  <Icon className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white/60">{getSystemLabel(systemName)}</div>
                    <div className="text-xs text-muted-foreground">
                      Weight: {systemData.weight}% | Score: {systemData.score}/100
                    </div>
                  </div>
                  {getStatusBadge(systemData.status)}
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="pt-4 space-y-4">
                {/* Parameters Evaluated */}
                <div>
                  <h5 className="text-sm font-semibold text-white/90 mb-2">Parameters Evaluated</h5>
                  <div className="flex flex-wrap gap-2">
                    {systemData.parametersEvaluated.map((param, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {param}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Key Issues */}
                {systemData.keyIssues.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                      {getStatusIcon(systemData.status)}
                      Issues Identified
                    </h5>
                    <ul className="space-y-1">
                      {systemData.keyIssues.map((issue, index) => (
                        <li key={index} className="text-xs text-orange-700 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {systemRecommendations.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-blue-800 mb-2">Recommendations</h5>
                    <ul className="space-y-1">
                      {systemRecommendations.map((rec, index) => (
                        <li key={index} className="text-xs text-white/80 flex items-start gap-2">
                          <span className="text-white/70 mt-0.5">▶</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Status Explanation */}
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-xs text-white/80">
                    {systemData.status === 'optimal' && `Your ${getSystemLabel(systemName).toLowerCase()} is performing optimally. Continue maintaining your current health habits.`}
                    {systemData.status === 'good' && `Your ${getSystemLabel(systemName).toLowerCase()} is performing well. Minor improvements could enhance your health further.`}
                    {systemData.status === 'borderline' && `Your ${getSystemLabel(systemName).toLowerCase()} shows borderline values. Consider lifestyle modifications and monitor regularly.`}
                    {systemData.status === 'abnormal' && `Your ${getSystemLabel(systemName).toLowerCase()} requires attention. Consult your healthcare provider for personalized guidance.`}
                    {systemData.status === 'critical' && `Your ${getSystemLabel(systemName).toLowerCase()} requires immediate medical attention. Schedule a consultation with your doctor promptly.`}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Medical Guidelines Reference */}
      <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4 mt-4">
        <h5 className="text-sm font-semibold text-white/90 mb-2">Medical Guidelines Referenced</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
          <div>• <strong>ADA Guidelines 2024</strong> - Diabetes/Metabolic</div>
          <div>• <strong>AHA/ACC Guidelines</strong> - Cardiovascular</div>
          <div>• <strong>KDIGO Guidelines</strong> - Kidney Function</div>
          <div>• <strong>WHO Guidelines</strong> - Hematologic Parameters</div>
          <div>• <strong>ICMR-INDIAB Studies</strong> - Indian Population Norms</div>
          <div>• <strong>Hepatology Guidelines</strong> - Liver Function</div>
        </div>
      </div>
    </div>
  );
};
