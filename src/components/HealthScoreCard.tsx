import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Activity, 
  Droplet, 
  Leaf, 
  Zap, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar
} from "lucide-react";
import { HealthScoreBreakdown, SystemScore } from "@/utils/healthScoreCalculator";
import { SystemScoreBreakdown } from "./SystemScoreBreakdown";
import { HealthImprovementPlanModal } from "./HealthImprovementPlanModal";
import { generate30DayPlan } from "@/utils/generate30DayPlan";

interface HealthScoreCardProps {
  breakdown: HealthScoreBreakdown;
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-600";
};

const getProgressColor = (score: number): string => {
  if (score >= 90) return "bg-green-600";
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-600";
};

const getCategoryBadgeVariant = (category: string): "default" | "secondary" | "destructive" | "outline" => {
  if (category === 'excellent' || category === 'good') return "default";
  if (category === 'fair') return "secondary";
  if (category === 'needs-attention') return "outline";
  return "destructive";
};

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
    metabolic: 'Metabolic',
    cardiovascular: 'Cardiovascular',
    kidney: 'Kidney',
    liver: 'Liver',
    hematologic: 'Blood Health',
    endocrine: 'Endocrine'
  };
  return labels[systemName] || systemName;
};

export const HealthScoreCard = ({ breakdown }: HealthScoreCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const { overallScore, category, categoryLabel, categoryColor, systemScores, modifiers, recommendations, comparisonToPopulation } = breakdown;
  
  // Log health score calculation for audit
  useEffect(() => {
    const systemScoresArray = Object.entries(systemScores).map(([name, score]) => ({
      name,
      score: score.score,
      status: score.status
    }));
    
    console.log('[AUDIT] Health score calculated:', {
      overallScore,
      category,
      systemScores: systemScoresArray,
      timestamp: new Date().toISOString()
    });
  }, [overallScore]);

  // Animate score counter
  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 frames
    const increment = overallScore / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setDisplayScore(Math.round(increment * currentStep));
      } else {
        setDisplayScore(overallScore);
        clearInterval(timer);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [overallScore]);

  // Check if any system needs improvement
  const needsImprovement = Object.values(systemScores).some(
    (system: SystemScore) => system.score < 70
  );

  const handleGeneratePlan = () => {
    // Allow all users to view 30-day plan without authentication
    setIsPlanModalOpen(true);
  };

  const improvementPlan = generate30DayPlan(breakdown);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-poppins text-navy flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Your Health Score
          </CardTitle>
          <Badge variant={getCategoryBadgeVariant(category)} className="text-sm px-3 py-1">
            {categoryLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Large Circular Score Display */}
        <div className="flex flex-col items-center justify-center py-6 md:py-8">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center">
            {/* Circular progress background */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                className={getScoreColor(overallScore)}
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - overallScore / 100)}`}
                style={{ transition: 'stroke-dashoffset 2s ease-in-out' }}
              />
            </svg>
            
            {/* Score number */}
            <div className="text-center z-10">
              <div className={`text-5xl sm:text-6xl md:text-7xl font-bold ${getScoreColor(overallScore)} transition-all duration-200`}>
                {displayScore}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">out of 100</div>
            </div>
          </div>

          {/* Population Comparison */}
          {comparisonToPopulation && (
            <div className="mt-4 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 max-w-md">
              <p className="text-sm text-blue-800 text-center flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{comparisonToPopulation}</span>
              </p>
            </div>
          )}
        </div>

        {/* System Scores Grid */}
        <div className="space-y-4">
          <h4 className="font-semibold text-navy text-lg">Body Systems Breakdown</h4>
          <div className="grid gap-4">
            {Object.entries(systemScores).map(([systemName, systemData]: [string, SystemScore]) => {
              const Icon = getSystemIcon(systemName);
              return (
                <div key={systemName} className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${getScoreColor(systemData.score)}`} />
                      <span className="font-medium text-slate">{getSystemLabel(systemName)}</span>
                      <span className="text-xs text-muted-foreground">({systemData.weight}%)</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(systemData.score)}`}>
                      {systemData.score}/100
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={systemData.score} 
                      className="h-2"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 rounded-full ${getProgressColor(systemData.score)} transition-all duration-1000`}
                      style={{ width: `${systemData.score}%` }}
                    />
                  </div>
                  {systemData.keyIssues.length > 0 && (
                    <div className="ml-7 text-xs text-orange-600 flex items-start gap-1">
                      <span>⚠</span>
                      <span>{systemData.keyIssues[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Modifiers */}
        {modifiers.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
            <h5 className="font-semibold text-orange-800 text-sm">Risk Factors Considered</h5>
            <div className="space-y-1">
              {modifiers.map((modifier, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-orange-700">{modifier.factor}</span>
                  <span className="font-medium text-orange-800">{modifier.impact} points</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h5 className="font-semibold text-blue-800 text-sm">Key Improvement Areas</h5>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="text-xs text-blue-700 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">▶</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Detailed Breakdown
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                View Detailed Breakdown
              </>
            )}
          </Button>

          <Button
            onClick={handleGeneratePlan}
            variant="default"
            className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Generate 30-Day Plan
          </Button>
        </div>

        {/* Detailed Breakdown */}
        {isExpanded && (
          <div className="animate-fade-in">
            <SystemScoreBreakdown breakdown={breakdown} />
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-muted-foreground text-center">
            This health score is calculated based on established medical guidelines (ADA, AHA, KDIGO, WHO) 
            and is intended for educational purposes. Always consult your healthcare provider for personalized medical advice.
          </p>
        </div>
      </CardContent>

      {/* 30-Day Improvement Plan Modal */}
      <HealthImprovementPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        plan={improvementPlan}
        patientName={undefined}
      />
    </Card>
  );
};
