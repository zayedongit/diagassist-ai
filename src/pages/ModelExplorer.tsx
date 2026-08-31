import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Brain, FlaskConical, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  predictDiabetesFromValues, diabetesMeta,
  predictBreastCancer, breastCancerMeta,
} from "@/lib/riskModel";

// Two real rows from the scikit-learn breast cancer dataset (30 features each).
const BC_MALIGNANT = [18.01,20.56,118.4,1007.0,0.1001,0.1289,0.117,0.0776,0.2116,0.0608,0.7548,1.288,5.353,89.74,0.008,0.027,0.0374,0.0165,0.029,0.004,21.53,26.06,143.4,1426.0,0.1309,0.2327,0.2544,0.1489,0.3251,0.0762];
const BC_BENIGN    = [12.25,17.94,78.27,460.3,0.0865,0.0668,0.0389,0.0233,0.197,0.0623,0.22,0.9823,1.484,16.51,0.0055,0.0156,0.0199,0.0079,0.018,0.0025,13.59,25.22,86.6,564.2,0.1217,0.1788,0.1943,0.0821,0.3113,0.0813];

const SLIDERS: { key: string; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "age", label: "Age", min: 20, max: 80, step: 1, unit: "yrs" },
  { key: "bmi", label: "BMI", min: 15, max: 45, step: 0.5, unit: "kg/m²" },
  { key: "bp", label: "Blood pressure", min: 60, max: 130, step: 1, unit: "mmHg" },
  { key: "hdl", label: "HDL cholesterol", min: 20, max: 90, step: 1, unit: "mg/dL" },
  { key: "glucose", label: "Blood glucose", min: 70, max: 250, step: 1, unit: "mg/dL" },
];

const Chip = ({ v, k }: { v: string | number; k: string }) => (
  <div className="rounded-lg border border-white/10 bg-card/60 px-3 py-2">
    <div className="text-lg font-bold text-foreground">{v}</div>
    <div className="text-[11px] text-muted-foreground">{k}</div>
  </div>
);

export default function ModelExplorer() {
  const [vals, setVals] = useState<Record<string, number>>({ age: 55, bmi: 28, bp: 95, hdl: 45, glucose: 130 });
  const pred = useMemo(() => predictDiabetesFromValues(vals), [vals]);
  const [bcExample, setBcExample] = useState<"malignant" | "benign" | null>(null);
  const bc = useMemo(() => bcExample ? predictBreastCancer(bcExample === "malignant" ? BC_MALIGNANT : BC_BENIGN) : null, [bcExample]);

  const bandColor = pred.band === "Higher" ? "text-red-500" : pred.band === "Moderate" ? "text-amber-500" : "text-emerald-500";
  const barColor = pred.band === "Higher" ? "bg-red-500" : pred.band === "Moderate" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Risk Model Explorer</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            The machine-learning models behind DiagAssist, running live in your browser. Trained offline on
            public datasets, cross-validated and probability-calibrated. Move the sliders to see the prediction
            and what drives it. Research/education only — not a diagnosis.
          </p>
        </header>

        {/* Diabetes interactive */}
        <Card className="border border-white/10 overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-foreground">Diabetes progression</h2>
              <span className="text-xs text-muted-foreground">· scikit-learn diabetes dataset (442 patients)</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* sliders */}
              <div className="space-y-4">
                {SLIDERS.map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{s.label}</span>
                      <span className="text-muted-foreground tabular-nums">{vals[s.key]} {s.unit}</span>
                    </div>
                    <input
                      type="range" min={s.min} max={s.max} step={s.step} value={vals[s.key]}
                      onChange={(e) => setVals((v) => ({ ...v, [s.key]: Number(e.target.value) }))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* live result */}
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Progression index</div>
                    <div className={cn("text-4xl font-bold leading-none", bandColor)}>{Math.round(pred.index)}<span className="text-lg text-muted-foreground">/100</span></div>
                    <div className={cn("text-sm font-medium mt-1", bandColor)}>{pred.band}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">P(faster than typical)</div>
                    <div className="text-3xl font-bold text-foreground">{Math.round(pred.probFaster * 100)}%</div>
                    <div className="text-[11px] text-muted-foreground">calibrated</div>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.round(pred.index)}%` }} />
                </div>
                {pred.drivers.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-foreground mb-1.5">What's driving it</div>
                    <div className="flex flex-wrap gap-2">
                      {pred.drivers.map((d) => (
                        <span key={d.label} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border",
                          d.direction === "up" ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500")}>
                          {d.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <Chip v={diabetesMeta.metrics.r2} k="Regression R² (test)" />
              <Chip v={`${diabetesMeta.metrics.rmse}`} k={`RMSE (vs ${diabetesMeta.metrics.baseline_rmse})`} />
              <Chip v={diabetesMeta.classAuc} k="Classifier AUC" />
              <Chip v={diabetesMeta.brier} k="Brier (calibration)" />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Ridge regression (α={String(diabetesMeta.bestAlpha)}) + calibrated logistic regression (C={String(diabetesMeta.bestC)}),
              both selected by 5-fold cross-validation. Inference runs entirely in your browser.
            </p>
          </CardContent>
        </Card>

        {/* Breast cancer demo */}
        <Card className="border border-white/10 overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-foreground">Breast cancer classifier</h2>
              <span className="text-xs text-muted-foreground">· standalone demo · Wisconsin dataset (569 samples)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A second disease, to show the same training pipeline generalizes. Inputs are biopsy cell
              measurements (not lab-report values), so it isn't wired into report analysis. Try a real example:
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBcExample("malignant")}
                className={cn("rounded-lg px-3 py-2 text-sm border transition", bcExample === "malignant" ? "bg-red-500/15 border-red-500/40 text-red-500" : "border-white/10 text-foreground hover:bg-card/60")}>
                Load a malignant case
              </button>
              <button onClick={() => setBcExample("benign")}
                className={cn("rounded-lg px-3 py-2 text-sm border transition", bcExample === "benign" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500" : "border-white/10 text-foreground hover:bg-card/60")}>
                Load a benign case
              </button>
            </div>
            {bc && (
              <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-card/60 p-3">
                <div>
                  <div className="text-xs text-muted-foreground">P(malignant)</div>
                  <div className={cn("text-3xl font-bold", bc.label === "malignant" ? "text-red-500" : "text-emerald-500")}>{Math.round(bc.prob * 100)}%</div>
                </div>
                <div className={cn("text-sm font-medium px-2.5 py-1 rounded-full", bc.label === "malignant" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                  predicted {bc.label}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Chip v={breastCancerMeta.metrics.auc} k="ROC-AUC (test)" />
              <Chip v={breastCancerMeta.metrics.cv_auc_mean} k="CV-AUC" />
              <Chip v={breastCancerMeta.metrics.accuracy} k="Accuracy" />
              <Chip v={breastCancerMeta.metrics.brier_after_cal ?? 0} k="Brier (calibration)" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
