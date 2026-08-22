import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Heart, Activity, Droplet, Leaf, Zap, Sun, Sparkles } from 'lucide-react';
import type { EnhancedAnalysisResult, LabValue } from '@/types/medicalAnalysis';
import type { ClinicalContext } from '@/utils/parseClinicalContext';

interface ExploreAspectsProps {
  enhancedData: EnhancedAnalysisResult | null;
  clinicalContext?: ClinicalContext;
}

type Factor = {
  id: string;
  label: string;
  type: 'toggle' | 'slider';
  // For sliders: is a HIGHER value better ('more') or worse ('less')?
  good?: 'more' | 'less';
  // For toggles: is turning it ON bad?
  badWhenOn?: boolean;
  weight: number;
  lowLabel?: string;
  highLabel?: string;
  tip: string; // shown when this factor is in the unhealthy zone
};

type Aspect = {
  id: string;
  title: string;
  icon: any;
  blurb: string;
  markers: RegExp; // report analytes related to this aspect
  factors: Factor[];
};

const ASPECTS: Aspect[] = [
  {
    id: 'heart',
    title: 'Heart Health',
    icon: Heart,
    blurb: 'How well your heart and blood vessels are doing, and the daily habits that keep them strong.',
    markers: /(ldl|hdl|cholesterol|triglyceride|vldl|non-hdl|lipoprotein|homocysteine|blood pressure)/i,
    factors: [
      { id: 'smoking', label: 'Do you smoke?', type: 'toggle', badWhenOn: true, weight: 22, tip: 'Quitting smoking is the single biggest thing you can do for your heart.' },
      { id: 'exercise', label: 'How active are you?', type: 'slider', good: 'more', weight: 16, lowLabel: 'Rarely', highLabel: 'Very active', tip: 'Aim for a brisk 30-minute walk most days — it really helps your heart.' },
      { id: 'diet', label: 'How healthy is your eating?', type: 'slider', good: 'more', weight: 14, lowLabel: 'Needs work', highLabel: 'Very healthy', tip: 'More vegetables, fruit and fish, less fried and processed food, helps your heart.' },
      { id: 'salt', label: 'How salty is your food?', type: 'slider', good: 'less', weight: 10, lowLabel: 'Low salt', highLabel: 'Very salty', tip: 'Cutting back on salt can help keep your blood pressure in a healthy range.' },
    ],
  },
  {
    id: 'sugar',
    title: 'Blood Sugar & Diabetes',
    icon: Activity,
    blurb: 'How steady your blood sugar is, and the choices that lower your chance of diabetes.',
    markers: /(glucose|hba1c|glycated|glycosylated|a1c|insulin|c-peptide|blood sugar|fasting sugar)/i,
    factors: [
      { id: 'sweets', label: 'How much sugary food/drink?', type: 'slider', good: 'less', weight: 18, lowLabel: 'Very little', highLabel: 'A lot', tip: 'Cutting sugary drinks and sweets is one of the fastest ways to steady your blood sugar.' },
      { id: 'exercise', label: 'How active are you?', type: 'slider', good: 'more', weight: 16, lowLabel: 'Rarely', highLabel: 'Very active', tip: 'Even a short walk after meals helps your body handle sugar better.' },
      { id: 'weight', label: 'Carrying extra weight?', type: 'toggle', badWhenOn: true, weight: 14, tip: 'Losing even a small amount of weight noticeably lowers diabetes risk.' },
      { id: 'sleep', label: 'How is your sleep?', type: 'slider', good: 'more', weight: 8, lowLabel: 'Poor', highLabel: 'Great', tip: 'Good sleep helps your body control blood sugar.' },
    ],
  },
  {
    id: 'kidney',
    title: 'Kidney Health',
    icon: Droplet,
    blurb: 'How well your kidneys are cleaning your blood, and simple ways to protect them.',
    markers: /(creatinine|egfr|urea|bun|uric acid|albumin|protein)/i,
    factors: [
      { id: 'hydration', label: 'How well do you hydrate?', type: 'slider', good: 'more', weight: 16, lowLabel: 'Rarely', highLabel: 'Plenty of water', tip: 'Drinking enough water helps your kidneys do their job.' },
      { id: 'salt', label: 'How salty is your food?', type: 'slider', good: 'less', weight: 14, lowLabel: 'Low salt', highLabel: 'Very salty', tip: 'Less salt takes strain off your kidneys and blood pressure.' },
      { id: 'painkillers', label: 'Frequent painkiller use?', type: 'toggle', badWhenOn: true, weight: 14, tip: 'Regular over-the-counter painkillers can be hard on the kidneys — use only as needed.' },
      { id: 'bp', label: 'Keeping blood pressure in check?', type: 'slider', good: 'more', weight: 10, lowLabel: 'Not sure', highLabel: 'Well managed', tip: 'Healthy blood pressure protects your kidneys over time.' },
    ],
  },
  {
    id: 'liver',
    title: 'Liver Health',
    icon: Leaf,
    blurb: 'How your liver is doing, and the habits that let it stay healthy.',
    markers: /(alt|ast|sgpt|sgot|bilirubin|ggt|alkaline phosphatase|albumin|liver)/i,
    factors: [
      { id: 'alcohol', label: 'How much alcohol?', type: 'slider', good: 'less', weight: 20, lowLabel: 'None', highLabel: 'A lot', tip: 'Less alcohol gives your liver a chance to repair and stay healthy.' },
      { id: 'weight', label: 'Carrying extra weight?', type: 'toggle', badWhenOn: true, weight: 14, tip: 'Extra weight can build up fat in the liver — losing a little helps a lot.' },
      { id: 'diet', label: 'How healthy is your eating?', type: 'slider', good: 'more', weight: 12, lowLabel: 'Needs work', highLabel: 'Very healthy', tip: 'Less fried and sugary food eases the load on your liver.' },
      { id: 'exercise', label: 'How active are you?', type: 'slider', good: 'more', weight: 8, lowLabel: 'Rarely', highLabel: 'Very active', tip: 'Regular movement helps keep your liver healthy.' },
    ],
  },
  {
    id: 'blood',
    title: 'Blood & Energy',
    icon: Zap,
    blurb: 'Your blood counts and iron — the things behind feeling energetic instead of tired.',
    markers: /(hemoglobin|haemoglobin|hb|iron|ferritin|b12|folate|rbc|hematocrit|mcv)/i,
    factors: [
      { id: 'ironfood', label: 'Iron-rich foods in your diet?', type: 'slider', good: 'more', weight: 16, lowLabel: 'Rarely', highLabel: 'Often', tip: 'Leafy greens, beans, and lean meat help keep your iron up.' },
      { id: 'vitc', label: 'Fruits/veg with vitamin C?', type: 'slider', good: 'more', weight: 10, lowLabel: 'Rarely', highLabel: 'Often', tip: 'Vitamin C helps your body absorb iron from food.' },
      { id: 'diet', label: 'How balanced is your eating?', type: 'slider', good: 'more', weight: 12, lowLabel: 'Needs work', highLabel: 'Very balanced', tip: 'A balanced diet supports healthy blood and steady energy.' },
    ],
  },
  {
    id: 'bone',
    title: 'Bone & Vitamin D',
    icon: Sun,
    blurb: 'The strength of your bones and your vitamin D — important for staying active as you age.',
    markers: /(vitamin d|25-oh|calcium|phosphorus|vitamin b|magnesium)/i,
    factors: [
      { id: 'sunlight', label: 'Time outdoors in sunlight?', type: 'slider', good: 'more', weight: 16, lowLabel: 'Rarely', highLabel: 'Daily', tip: 'A little daily sunlight helps your body make vitamin D.' },
      { id: 'calcium', label: 'Calcium foods (dairy, greens)?', type: 'slider', good: 'more', weight: 14, lowLabel: 'Rarely', highLabel: 'Often', tip: 'Calcium-rich foods keep your bones strong.' },
      { id: 'exercise', label: 'Weight-bearing activity?', type: 'slider', good: 'more', weight: 12, lowLabel: 'Rarely', highLabel: 'Often', tip: 'Walking and light strength work keep bones strong.' },
    ],
  },
  {
    id: 'wellness',
    title: 'General Wellness',
    icon: Sparkles,
    blurb: 'The everyday basics — sleep, stress, movement and food — that lift your whole health.',
    markers: /(a^)/, // matches nothing; wellness is general
    factors: [
      { id: 'sleep', label: 'How is your sleep?', type: 'slider', good: 'more', weight: 14, lowLabel: 'Poor', highLabel: 'Great', tip: 'Aim for 7-9 hours — good sleep improves almost everything.' },
      { id: 'stress', label: 'How much daily stress?', type: 'slider', good: 'less', weight: 12, lowLabel: 'Low', highLabel: 'High', tip: 'Small breaks, walks, or breathing exercises help lower stress.' },
      { id: 'exercise', label: 'How active are you?', type: 'slider', good: 'more', weight: 14, lowLabel: 'Rarely', highLabel: 'Very active', tip: 'Regular movement lifts mood, energy, and long-term health.' },
      { id: 'diet', label: 'How healthy is your eating?', type: 'slider', good: 'more', weight: 12, lowLabel: 'Needs work', highLabel: 'Very healthy', tip: 'More whole foods and less processed food helps your whole body.' },
    ],
  },
];

const statusChip = (status: string) => {
  switch (status) {
    case 'high': return 'text-red-700 bg-red-50 border-red-200';
    case 'low': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'critical': return 'text-red-800 bg-red-100 border-red-300';
    default: return 'text-green-700 bg-green-50 border-green-200';
  }
};

export const ExploreAspects = ({ enhancedData, clinicalContext }: ExploreAspectsProps) => {
  const [selectedId, setSelectedId] = useState<string>('heart');
  const [values, setValues] = useState<Record<string, number | boolean>>({});

  // All abnormal labs from the report, flattened (name/value/status/unit).
  const abnormalLabs: LabValue[] = useMemo(
    () => (enhancedData?.medicalPanels || []).flatMap((p) => p.abnormalLabs || []),
    [enhancedData]
  );
  const normalNames: string = useMemo(
    () => (enhancedData?.medicalPanels || []).flatMap((p) => p.normalParameters || []).join(' | ').toLowerCase(),
    [enhancedData]
  );

  const selected = ASPECTS.find((a) => a.id === selectedId) || ASPECTS[0];

  // Seed a factor's starting value from the person's known context, or a sensible default.
  const initialFor = (f: Factor): number | boolean => {
    if (f.type === 'toggle') {
      if (f.id === 'smoking') return clinicalContext?.lifestyle?.smoking || false;
      return false;
    }
    if (f.id === 'exercise') {
      const ex = clinicalContext?.lifestyle?.exercise;
      return ex === 'active' ? 75 : ex === 'moderate' ? 50 : 35;
    }
    if (f.id === 'diet') {
      const d = clinicalContext?.lifestyle?.diet;
      return d === 'healthy' ? 70 : d === 'fair' || d === 'balanced' ? 50 : 40;
    }
    // sensible neutral defaults
    if (f.good === 'less') return 45;
    return 50;
  };

  const valueOf = (f: Factor): number | boolean => {
    const key = `${selected.id}:${f.id}`;
    return key in values ? values[key] : initialFor(f);
  };

  const setValue = (f: Factor, v: number | boolean) => {
    setValues((prev) => ({ ...prev, [`${selected.id}:${f.id}`]: v }));
  };

  // Does the report show a related abnormal marker for this aspect?
  const relatedAbnormal = abnormalLabs.filter((l) => selected.markers.test(l.name || ''));
  const relatedNormal = selected.markers.test(normalNames);
  const hasIssue = relatedAbnormal.length > 0;

  // Compute a simple 0-100 outlook from the chosen factors, plus a projection
  // of how it could trend if habits stay the same vs. if they improve.
  const outlook = useMemo(() => {
    const base = hasIssue ? 62 : 82; // start lower if the report already flags this area

    const scoreFrom = (get: (f: Factor) => number | boolean): number => {
      let s = base;
      for (const f of selected.factors) {
        const v = get(f);
        if (f.type === 'toggle') {
          if (f.badWhenOn && (v as boolean)) s -= f.weight;
        } else {
          const n = (v as number) / 100; // 0..1
          s += (f.good === 'more' ? n - 0.5 : 0.5 - n) * f.weight * 2;
        }
      }
      return Math.max(4, Math.min(98, Math.round(s)));
    };

    // Tips for whatever is currently in the unhealthy zone.
    const tips: string[] = [];
    for (const f of selected.factors) {
      const v = valueOf(f);
      if (f.type === 'toggle') {
        if (f.badWhenOn && (v as boolean)) tips.push(f.tip);
      } else {
        const n = (v as number) / 100;
        if (f.good === 'more' && n < 0.45) tips.push(f.tip);
        if (f.good === 'less' && n > 0.55) tips.push(f.tip);
      }
    }

    const score = scoreFrom((f) => valueOf(f));
    // The best this area could look with healthy habits (all factors at their best).
    const potential = scoreFrom((f) => (f.type === 'toggle' ? false : f.good === 'less' ? 0 : 100));
    const gap = potential - score;

    // Projection: "same habits" stays flat; "better habits" eases up toward potential.
    const chart = [
      { t: 'Now', same: score, better: score },
      { t: '1 yr', same: score, better: Math.round(score + gap * 0.5) },
      { t: '3 yr', same: score, better: Math.round(score + gap * 0.82) },
      { t: '5 yr', same: score, better: potential },
    ];

    const label = score >= 82 ? 'Looking great' : score >= 66 ? 'Doing well' : score >= 48 ? 'Room to improve' : 'Needs some care';
    const color = score >= 82 ? 'hsl(142 45% 40%)' : score >= 66 ? 'hsl(95 32% 34%)' : score >= 48 ? 'hsl(38 80% 45%)' : 'hsl(4 65% 48%)';
    return { score, potential, label, color, tips: tips.slice(0, 3), chart };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, values, hasIssue]);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-poppins font-light text-foreground">Explore Your Health</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pick any area to learn about it and see how everyday habits shape it. Open to everyone, whatever your results.
        </p>
      </div>

      {/* Glass MCQ aspect boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {ASPECTS.map((a) => {
          const Icon = a.icon;
          const active = a.id === selectedId;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={`group flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                active ? 'ring-2 ring-primary/60' : 'hover:-translate-y-0.5'
              }`}
              style={{
                background: active ? 'rgba(255,253,247,0.85)' : 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(14px) saturate(140%)',
                WebkitBackdropFilter: 'blur(14px) saturate(140%)',
                borderColor: active ? 'hsl(95 30% 40% / 0.5)' : 'rgba(255,255,255,0.6)',
                boxShadow: active
                  ? '0 12px 30px -14px hsl(95 25% 20% / 0.4)'
                  : '0 6px 18px -12px hsl(95 25% 20% / 0.25)',
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: active ? 'hsl(95 30% 26%)' : 'hsl(95 24% 30% / 0.12)' }}
              >
                <Icon className="h-4 w-4" style={{ color: active ? 'hsl(44 44% 92%)' : 'hsl(95 30% 28%)' }} />
              </span>
              <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">{a.title}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive panel for the selected aspect */}
      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{
          background: 'rgba(255,253,247,0.7)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          borderColor: 'rgba(255,255,255,0.55)',
          boxShadow: '0 18px 44px -20px hsl(95 25% 18% / 0.35), inset 0 1px 0 rgba(255,255,255,0.55)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'hsl(95 30% 26%)' }}>
            <selected.icon className="h-5 w-5" style={{ color: 'hsl(44 44% 92%)' }} />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-foreground">{selected.title}</h4>
            <p className="text-sm text-foreground/80 leading-relaxed mt-0.5">{selected.blurb}</p>
          </div>
        </div>

        {/* Your related results */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">From your report</p>
          {relatedAbnormal.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {relatedAbnormal.slice(0, 6).map((l, i) => (
                <span key={i} className={`rounded-full border px-3 py-1 text-xs ${statusChip(l.status)}`}>
                  {l.name}: {l.value}{l.unit ? ` ${l.unit}` : ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/80">
              {relatedNormal
                ? 'Your results in this area look normal. This is a good chance to learn what keeps it that way.'
                : 'This area was not specifically flagged in your report, so explore freely to learn what keeps it healthy.'}
            </p>
          )}
        </div>

        {/* Interactive factors */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try adjusting these factors</p>
            {selected.factors.map((f) => (
              <div key={f.id} className="rounded-lg border border-white/60 bg-white/55 p-3">
                {f.type === 'toggle' ? (
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${selected.id}-${f.id}`} className="text-sm font-medium text-foreground">{f.label}</Label>
                    <Switch
                      id={`${selected.id}-${f.id}`}
                      checked={valueOf(f) as boolean}
                      onCheckedChange={(c) => setValue(f, c)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={`${selected.id}-${f.id}`} className="text-sm font-medium text-foreground">{f.label}</Label>
                    <Slider
                      id={`${selected.id}-${f.id}`}
                      value={[valueOf(f) as number]}
                      onValueChange={(v) => setValue(f, v[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full touch-none"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{f.lowLabel}</span>
                      <span>{f.highLabel}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Outlook meter + tips */}
          <div className="space-y-4">
            <div className="rounded-lg border border-white/60 bg-white/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Your outlook for this area</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold" style={{ color: outlook.color }}>{outlook.score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <span className="ml-auto text-sm font-medium" style={{ color: outlook.color }}>{outlook.label}</span>
              </div>
              <div className="mt-3 h-2.5 w-full rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${outlook.score}%`, background: outlook.color }}
                />
              </div>

              {/* Projection chart: how this area could trend over the next few years */}
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={outlook.chart} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="t" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                      label={{ value: 'Outlook', angle: -90, position: 'insideLeft', offset: 14, style: { fill: '#9ca3af', fontSize: 10 } }}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val}/100`, name]}
                      contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,253,247,0.95)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="same"
                      name="If habits stay the same"
                      stroke="hsl(95 12% 58%)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="better"
                      name="If you build better habits"
                      stroke="hsl(142 45% 40%)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: 'hsl(95 12% 58%)' }} />
                  Same habits
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: 'hsl(142 45% 40%)' }} />
                  Better habits
                </span>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                A simple guide based on the habits above — not a medical score. Move the sliders to see how changes could help.
              </p>
            </div>

            {outlook.tips.length > 0 && (
              <div className="rounded-lg border border-white/60 bg-white/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Small changes that help</p>
                <ul className="space-y-2">
                  {outlook.tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'hsl(95 30% 34%)' }} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
