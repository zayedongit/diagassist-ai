import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { EnhancedAnalysisResult, LabValue } from '@/types/medicalAnalysis';
import { compareWithPopulation } from '@/utils/populationData';

interface LabTrendComparisonProps {
  currentAnalysis: EnhancedAnalysisResult;
  previousAnalysis: EnhancedAnalysisResult;
}

interface TrendData {
  parameter: string;
  previousValue: string;
  currentValue: string;
  unit?: string;
  change: number;
  trendDirection: 'up' | 'down' | 'stable';
  severity: 'critical' | 'moderate' | 'slight' | 'normal';
  populationComparison?: string;
}

function parseNumericValue(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function calculateTrend(previous: LabValue, current: LabValue, demographics?: EnhancedAnalysisResult['demographics']): TrendData | null {
  const prevNum = parseNumericValue(previous.value);
  const currNum = parseNumericValue(current.value);
  
  if (prevNum === null || currNum === null) return null;
  
  const change = ((currNum - prevNum) / prevNum) * 100;
  const absChange = Math.abs(change);
  
  let trendDirection: 'up' | 'down' | 'stable';
  let severity: 'critical' | 'moderate' | 'slight' | 'normal';
  
  if (absChange < 5) {
    trendDirection = 'stable';
    severity = 'normal';
  } else {
    trendDirection = change > 0 ? 'up' : 'down';
    
    // Determine severity based on change and status
    if (absChange > 30 || current.status === 'critical') {
      severity = 'critical';
    } else if (absChange > 15 || current.status === 'high' || current.status === 'low') {
      severity = 'moderate';
    } else {
      severity = 'slight';
    }
  }
  
  // Get population comparison if demographics available
  let populationComparison: string | undefined;
  if (demographics?.age && demographics?.gender) {
    const popComp = compareWithPopulation(
      currNum,
      current.name,
      demographics.age,
      demographics.gender
    );
    
    if (popComp) {
      const sign = popComp.percentageDifference >= 0 ? '+' : '';
      populationComparison = `Indian avg: ${popComp.populationAverage.toFixed(1)}${current.unit || ''} (You: ${sign}${popComp.percentageDifference.toFixed(0)}%)`;
    }
  }
  
  return {
    parameter: current.name,
    previousValue: previous.value,
    currentValue: current.value,
    unit: current.unit,
    change,
    trendDirection,
    severity,
    populationComparison
  };
}

function getTrendIcon(direction: 'up' | 'down' | 'stable', severity: string) {
  if (direction === 'stable') {
    return <Minus className="w-4 h-4 text-white/80" />;
  }
  
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  const colorClass = severity === 'critical' ? 'text-red-600' : 
                     severity === 'moderate' ? 'text-orange-600' : 
                     severity === 'slight' ? 'text-yellow-600' : 'text-green-600';
  
  return <Icon className={`w-4 h-4 ${colorClass}`} />;
}

function getTrendBadge(direction: 'up' | 'down' | 'stable', severity: string) {
  if (direction === 'stable') {
    return <span className="text-xs text-white/80 font-medium">Stable</span>;
  }
  
  const text = direction === 'up' ? 
    (severity === 'critical' ? 'Significantly Higher' : severity === 'moderate' ? 'Higher' : 'Slightly Higher') :
    (severity === 'critical' ? 'Significantly Lower' : severity === 'moderate' ? 'Lower' : 'Slightly Lower');
  
  const colorClass = severity === 'critical' ? 'text-red-600' : 
                     severity === 'moderate' ? 'text-orange-600' : 
                     severity === 'slight' ? 'text-yellow-600' : 'text-green-600';
  
  return <span className={`text-xs ${colorClass} font-medium`}>{text}</span>;
}

export function LabTrendComparison({ currentAnalysis, previousAnalysis }: LabTrendComparisonProps) {
  // Extract all abnormal labs from both analyses
  const currentLabs = currentAnalysis.medicalPanels?.flatMap(p => p.abnormalLabs) || currentAnalysis.labs || [];
  const previousLabs = previousAnalysis.medicalPanels?.flatMap(p => p.abnormalLabs) || previousAnalysis.labs || [];
  
  // Find matching parameters between current and previous
  const trends: TrendData[] = [];
  
  currentLabs.forEach(currentLab => {
    const matchingPrevious = previousLabs.find(
      prev => prev.name.toLowerCase() === currentLab.name.toLowerCase()
    );
    
    if (matchingPrevious) {
      const trend = calculateTrend(matchingPrevious, currentLab, currentAnalysis.demographics);
      if (trend) {
        trends.push(trend);
      }
    }
  });
  
  if (trends.length === 0) {
    return null;
  }
  
  const previousDate = new Date(previousAnalysis.testDate || '').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  const currentDate = new Date(currentAnalysis.testDate || '').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  return (
    <Card className="p-6 bg-gradient-to-br from-white/5 to-white/5 border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-white/80" />
        <h3 className="text-lg font-semibold text-white">Lab Trend Analysis & Population Comparison</h3>
      </div>
      
      <p className="text-sm text-white/80 mb-4">
        Comparing: <span className="font-medium">{previousDate}</span> vs <span className="font-medium">{currentDate}</span>
      </p>
      
      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/10 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Parameter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Previous</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Current</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Trend</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">Population</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trends.map((trend, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-white">{trend.parameter}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-white/80">{trend.previousValue}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-white">{trend.currentValue}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trend.trendDirection, trend.severity)}
                      <div className="flex flex-col">
                        {getTrendBadge(trend.trendDirection, trend.severity)}
                        {trend.trendDirection !== 'stable' && (
                          <span className="text-xs text-white/60">
                            {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {trend.populationComparison ? (
                      <span className="text-xs text-white/80">{trend.populationComparison}</span>
                    ) : (
                      <span className="text-xs text-white/50">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {currentAnalysis.demographics?.age && currentAnalysis.demographics?.gender && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-white/80">
            <span className="font-semibold">Population Reference:</span> Compared with Indian {currentAnalysis.demographics.gender === 'male' ? 'males' : 'females'} aged {currentAnalysis.demographics.age} based on ICMR-INDIAB studies
          </p>
        </div>
      )}
    </Card>
  );
}
