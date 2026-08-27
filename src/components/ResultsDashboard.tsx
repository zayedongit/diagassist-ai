import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, TrendingUp, Compass, ArrowRight } from 'lucide-react';
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
  const [activeId, setActiveId] = useState<string>('');

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

  const scoreColor =
    !data ? 'hsl(95 32% 34%)' :
    data.score >= 78 ? 'hsl(142 45% 40%)' :
    data.score >= 62 ? 'hsl(95 32% 34%)' :
    data.score >= 42 ? 'hsl(38 80% 45%)' :
    'hsl(4 65% 48%)';

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { id: 'health-score-section', icon: Activity, label: 'Overall Health', value: `${data.score}`, unit: '/100', caption: data.scoreLabel || 'Health score', accent: scoreColor, soft: scoreColor.replace(')', ' / 0.12)'), action: 'View score' },
      { id: 'comprehensive-report-section', icon: AlertTriangle, label: 'Key Findings', value: `${data.abnormalCount}`, unit: 'flagged', caption: `across ${data.panelsCount} panel${data.panelsCount === 1 ? '' : 's'}`, accent: 'hsl(4 60% 50%)', soft: 'hsl(4 60% 50% / 0.12)', action: 'View report' },
      { id: 'risk-analysis-section', icon: TrendingUp, label: 'Long-term Risk', value: data.riskLabel, unit: '', caption: 'Heart & diabetes outlook', accent: 'hsl(30 70% 45%)', soft: 'hsl(30 70% 45% / 0.12)', action: 'View risk' },
      { id: 'explore-health-section', icon: Compass, label: 'Explore Health', value: '7', unit: 'areas', caption: 'Interactive tools', accent: 'hsl(95 32% 34%)', soft: 'hsl(95 32% 34% / 0.12)', action: 'Explore' },
    ];
  }, [data, scoreColor]);

  // Scroll-spy: highlight the card for the section currently in view, so the row
  // doubles as a "you are here" navigator.
  useEffect(() => {
    if (!cards.length) return;
    let observer: IntersectionObserver | null = null;
    let tries = 0;

    const attach = () => {
      const els = cards.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
      if (els.length === 0) {
        if (tries++ < 10) setTimeout(attach, 250);
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible[0]) setActiveId(visible[0].target.id);
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
      );
      els.forEach((el) => observer!.observe(el));
    };
    attach();
    return () => observer?.disconnect();
  }, [cards]);

  if (!data) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-foreground">At a glance</p>
          <p className="text-xs text-muted-foreground">Tap a card to jump to that section</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((c) => {
            const isActive = activeId === c.id;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => scrollTo(c.id)}
                aria-label={`Jump to ${c.label}`}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border p-4 pb-3 text-left transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{
                  ['--accent' as any]: c.accent,
                  background: isActive ? 'rgba(255,253,247,0.85)' : 'rgba(255,253,247,0.6)',
                  backdropFilter: 'blur(16px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                  borderColor: isActive ? c.accent : 'rgba(255,255,255,0.6)',
                  boxShadow: isActive
                    ? `0 0 0 1px ${c.accent}, 0 14px 30px -16px hsl(95 25% 20% / 0.45)`
                    : '0 10px 26px -16px hsl(95 25% 20% / 0.35)',
                }}
              >
                {/* accent top bar — brighter when this section is in view */}
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.accent, opacity: isActive ? 1 : 0.5 }} />

                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: c.soft }}>
                    <Icon className="h-4 w-4" style={{ color: c.accent }} />
                  </span>
                  {isActive && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: c.soft, color: c.accent }}>
                      Viewing
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold" style={{ color: c.accent }}>{c.value}</span>
                  {c.unit && <span className="text-xs text-muted-foreground">{c.unit}</span>}
                </div>
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground truncate">{c.caption}</p>

                {/* persistent click affordance */}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: c.accent }}>
                  {c.action}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
