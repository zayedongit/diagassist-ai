import { useMemo } from 'react';
import { Activity, AlertTriangle, TrendingUp, Compass, ChevronRight } from 'lucide-react';
import { calculateHealthScore } from '@/utils/healthScoreCalculator';
import { calculateHealthRisks } from '@/utils/healthRiskCalculator';
import type { EnhancedAnalysisResult } from '@/types/medicalAnalysis';
import type { ClinicalContext } from '@/utils/parseClinicalContext';

interface ResultsDashboardProps {
  enhancedData: EnhancedAnalysisResult | null;
  demographics?: any;
  clinicalContext?: ClinicalContext;
}

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const ResultsDashboard = ({ enhancedData, demographics, clinicalContext }: ResultsDashboardProps) => {
  const data = useMemo(() => {
    if (!enhancedData) return null;
    const panels = enhancedData.medicalPanels || [];
    const abnormal = panels.flatMap((p) => p.abnormalLabs || []);
    let score = 0;
    let scoreLabel = '';
    let riskLabel = '—';
    try {
      const s = calculateHealthScore(enhancedData, demographics, clinicalContext);
      score = s.overallScore;
      scoreLabel = s.categoryLabel;
      const r = calculateHealthRisks(enhancedData, demographics, clinicalContext);
      const lvl = r.overallRiskLevel;
      riskLabel = lvl === 'low' ? 'Low' : lvl === 'moderate' ? 'Moderate' : lvl === 'high' ? 'High' : 'Very high';
    } catch {
      /* keep defaults */
    }
    return { panelsCount: panels.length, abnormalCount: abnormal.length, score, scoreLabel, riskLabel };
  }, [enhancedData, demographics, clinicalContext]);

  if (!data) return null;

  const scoreColor =
    data.score >= 78 ? 'hsl(142 45% 40%)' :
    data.score >= 62 ? 'hsl(95 32% 34%)' :
    data.score >= 42 ? 'hsl(38 80% 45%)' :
    'hsl(4 65% 48%)';

  const cards = [
    {
      id: 'health-score-section',
      icon: Activity,
      label: 'Overall Health',
      value: `${data.score}`,
      unit: '/100',
      caption: data.scoreLabel || 'Health score',
      accent: scoreColor,
      soft: scoreColor.replace(')', ' / 0.12)'),
    },
    {
      id: 'comprehensive-report-section',
      icon: AlertTriangle,
      label: 'Key Findings',
      value: `${data.abnormalCount}`,
      unit: 'flagged',
      caption: `across ${data.panelsCount} panel${data.panelsCount === 1 ? '' : 's'}`,
      accent: 'hsl(4 60% 50%)',
      soft: 'hsl(4 60% 50% / 0.12)',
    },
    {
      id: 'risk-analysis-section',
      icon: TrendingUp,
      label: 'Long-term Risk',
      value: data.riskLabel,
      unit: '',
      caption: 'Heart & diabetes outlook',
      accent: 'hsl(30 70% 45%)',
      soft: 'hsl(30 70% 45% / 0.12)',
    },
    {
      id: 'explore-health-section',
      icon: Compass,
      label: 'Explore Health',
      value: '7',
      unit: 'areas',
      caption: 'Interactive tools',
      accent: 'hsl(95 32% 34%)',
      soft: 'hsl(95 32% 34% / 0.12)',
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => scrollTo(c.id)}
            className="group relative text-left rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'rgba(255,253,247,0.6)',
              backdropFilter: 'blur(16px) saturate(140%)',
              WebkitBackdropFilter: 'blur(16px) saturate(140%)',
              borderColor: 'rgba(255,255,255,0.6)',
              boxShadow: '0 10px 26px -16px hsl(95 25% 20% / 0.35)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: c.soft }}>
                <c.icon className="h-4 w-4" style={{ color: c.accent }} />
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: c.accent }}>{c.value}</span>
              {c.unit && <span className="text-xs text-muted-foreground">{c.unit}</span>}
            </div>
            <p className="text-sm font-medium text-foreground">{c.label}</p>
            <p className="text-xs text-muted-foreground truncate">{c.caption}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
