import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Activity, Apple, Cigarette, TrendingDown, TrendingUp } from 'lucide-react';
import type { RiskScore } from '@/utils/healthRiskCalculator';
import type { ClinicalContext } from '@/utils/parseClinicalContext';

interface InteractiveRiskCalculatorProps {
  cardiovascularRisk: RiskScore;
  diabetesRisk: RiskScore;
  clinicalContext?: ClinicalContext;
}

export const InteractiveRiskCalculator = ({
  cardiovascularRisk,
  diabetesRisk,
  clinicalContext,
}: InteractiveRiskCalculatorProps) => {
  const [smoking, setSmoking] = useState(clinicalContext?.lifestyle?.smoking || false);
  const [exercise, setExercise] = useState(
    clinicalContext?.lifestyle?.exercise === 'active' ? 75 : 
    clinicalContext?.lifestyle?.exercise === 'moderate' ? 50 : 25
  );
  const [diet, setDiet] = useState(
    clinicalContext?.lifestyle?.diet === 'healthy' ? 75 : 
    clinicalContext?.lifestyle?.diet === 'fair' || clinicalContext?.lifestyle?.diet === 'balanced' ? 50 : 25
  );

  // Calculate risk reduction based on lifestyle improvements
  const calculateAdjustedRisk = (baseRisk: RiskScore) => {
    let adjustment = 0;
    
    // Smoking cessation: 20-30% risk reduction
    if (clinicalContext?.lifestyle?.smoking && !smoking) {
      adjustment -= 25;
    } else if (!clinicalContext?.lifestyle?.smoking && smoking) {
      adjustment += 25;
    }
    
    // Exercise improvement (per 25 point increase = ~10% reduction)
    const baseExercise = 
      clinicalContext?.lifestyle?.exercise === 'active' ? 75 : 
      clinicalContext?.lifestyle?.exercise === 'moderate' ? 50 : 25;
    const exerciseDiff = (exercise - baseExercise) / 25;
    adjustment -= exerciseDiff * 10;
    
    // Diet improvement (per 25 point increase = ~8% reduction)
    const baseDiet = 
      clinicalContext?.lifestyle?.diet === 'healthy' ? 75 : 
      clinicalContext?.lifestyle?.diet === 'fair' || clinicalContext?.lifestyle?.diet === 'balanced' ? 50 : 25;
    const dietDiff = (diet - baseDiet) / 25;
    adjustment -= dietDiff * 8;
    
    // Calculate new score (don't go below 0 or above 100)
    const newScore = Math.max(0, Math.min(100, baseRisk.score + adjustment));
    
    return {
      score: newScore,
      change: adjustment,
      percentChange: baseRisk.score > 0 ? (adjustment / baseRisk.score) * 100 : 0
    };
  };

  const cvAdjusted = calculateAdjustedRisk(cardiovascularRisk);
  const diabetesAdjusted = calculateAdjustedRisk(diabetesRisk);

  const getRiskLevel = (score: number): string => {
    if (score < 5) return 'low';
    if (score < 10) return 'moderate';
    if (score < 20) return 'high';
    return 'very-high';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success';
      case 'moderate': return 'text-warning';
      case 'high': return 'text-destructive';
      case 'very-high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getExerciseLabel = (value: number) => {
    if (value >= 75) return 'Very Active (5+ days/week)';
    if (value >= 50) return 'Moderate (3-4 days/week)';
    return 'Sedentary (0-2 days/week)';
  };

  const getDietLabel = (value: number) => {
    if (value >= 75) return 'Excellent (Mediterranean/DASH)';
    if (value >= 50) return 'Good (Balanced)';
    return 'Needs Improvement';
  };

  return (
    <Card className="p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-background to-muted/20 border-primary/20">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Interactive Risk Calculator
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Adjust lifestyle factors below to see how changes could impact your 10-year health risks
          </p>
        </div>

        {/* Lifestyle Controls */}
        <div className="space-y-4 sm:space-y-6 bg-card p-3 sm:p-4 rounded-lg border">
          {/* Smoking */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex items-center gap-2 sm:gap-3">
              <Cigarette className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="smoking" className="text-sm sm:text-base font-medium">Smoking Status</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Currently {smoking ? 'smoker' : 'non-smoker'}</p>
              </div>
            </div>
            <Switch
              id="smoking"
              checked={smoking}
              onCheckedChange={setSmoking}
              className="scale-110 sm:scale-100"
            />
          </div>

          {/* Exercise */}
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="exercise" className="text-sm sm:text-base font-medium">Physical Activity</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{getExerciseLabel(exercise)}</p>
              </div>
            </div>
            <Slider
              id="exercise"
              value={[exercise]}
              onValueChange={(value) => setExercise(value[0])}
              min={0}
              max={100}
              step={25}
              className="w-full touch-none"
            />
          </div>

          {/* Diet */}
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Apple className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="diet" className="text-sm sm:text-base font-medium">Diet Quality</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{getDietLabel(diet)}</p>
              </div>
            </div>
            <Slider
              id="diet"
              value={[diet]}
              onValueChange={(value) => setDiet(value[0])}
              min={0}
              max={100}
              step={25}
              className="w-full touch-none"
            />
          </div>
        </div>

        {/* Risk Predictions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Cardiovascular Risk */}
          <div className="bg-card p-3 sm:p-4 rounded-lg border space-y-2 sm:space-y-3">
            <h4 className="font-semibold text-xs sm:text-sm flex items-center justify-between">
              <span>10-Year Cardiovascular Risk</span>
              {cvAdjusted.change !== 0 && (
                <Badge variant={cvAdjusted.change < 0 ? 'default' : 'destructive'} className="gap-1 text-[10px] sm:text-xs">
                  {cvAdjusted.change < 0 ? <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                  {Math.abs(cvAdjusted.percentChange).toFixed(0)}%
                </Badge>
              )}
            </h4>
            <div className="flex items-baseline gap-2 sm:gap-3">
              <div className="flex-1">
                <p className="text-2xl sm:text-3xl font-bold">{cvAdjusted.score.toFixed(1)}%</p>
                <p className={`text-xs sm:text-sm font-medium ${getRiskColor(getRiskLevel(cvAdjusted.score))}`}>
                  {getRiskLevel(cvAdjusted.score).replace('-', ' ').toUpperCase()} RISK
                </p>
              </div>
              {cvAdjusted.change !== 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground line-through">{cardiovascularRisk.score.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Original</p>
                </div>
              )}
            </div>
          </div>

          {/* Diabetes Risk */}
          <div className="bg-card p-4 rounded-lg border space-y-3">
            <h4 className="font-semibold text-sm flex items-center justify-between">
              <span>10-Year Diabetes Risk</span>
              {diabetesAdjusted.change !== 0 && (
                <Badge variant={diabetesAdjusted.change < 0 ? 'default' : 'destructive'} className="gap-1">
                  {diabetesAdjusted.change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {Math.abs(diabetesAdjusted.percentChange).toFixed(0)}%
                </Badge>
              )}
            </h4>
            <div className="flex items-baseline gap-3">
              <div className="flex-1">
                <p className="text-3xl font-bold">{diabetesAdjusted.score.toFixed(1)}%</p>
                <p className={`text-sm font-medium ${getRiskColor(getRiskLevel(diabetesAdjusted.score))}`}>
                  {getRiskLevel(diabetesAdjusted.score).replace('-', ' ').toUpperCase()} RISK
                </p>
              </div>
              {diabetesAdjusted.change !== 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground line-through">{diabetesRisk.score.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Original</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insights */}
        {(cvAdjusted.change !== 0 || diabetesAdjusted.change !== 0) && (
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">💡 Impact of Lifestyle Changes</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {!smoking && clinicalContext?.lifestyle?.smoking && (
                <li>• Quitting smoking could reduce your risk by up to 25%</li>
              )}
              {exercise > (clinicalContext?.lifestyle?.exercise === 'active' ? 75 : 25) && (
                <li>• Increasing physical activity shows significant risk reduction</li>
              )}
              {diet > (clinicalContext?.lifestyle?.diet === 'healthy' ? 75 : 25) && (
                <li>• Improving diet quality contributes to lower health risks</li>
              )}
              {cvAdjusted.change < -15 && (
                <li>• These combined changes could substantially lower your cardiovascular risk</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};
