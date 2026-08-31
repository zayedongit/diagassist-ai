import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Info } from "lucide-react";
import { EnhancedAnalysisResult } from "@/types/medicalAnalysis";
import { predictDiabetesProgression } from "@/lib/riskModel";
import { cn } from "@/lib/utils";

/**
 * A machine-learning risk estimate that sits ALONGSIDE the LLM report.
 * The LLM explains the findings in words; this Ridge-regression model — trained
 * offline on a real patient dataset — gives a quantitative progression index
 * with transparent, per-feature explanations. Renders only when at least two of
 * its inputs were found in the report.
 */
export const RiskProjectionCard = ({ analysisData }: { analysisData: EnhancedAnalysisResult }) => {
  const p = predictDiabetesProgression(analysisData);
  if (!p.available) return null;

  const bandColor =
    p.band === "Higher" ? "text-red-600" : p.band === "Moderate" ? "text-amber-600" : "text-emerald-600";
  const barColor =
    p.band === "Higher" ? "bg-red-500" : p.band === "Moderate" ? "bg-amber-500" : "bg-emerald-500";
  const total = p.foundKeys.length + p.imputedKeys.length;

  return (
    <Card className="border border-indigo-200/40 bg-gradient-to-br from-indigo-50/60 to-sky-50/40 rounded-xl overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Diabetes progression — ML estimate
              </h3>
              <p className="text-xs text-muted-foreground">
                A machine-learning model trained on real patient data — separate from the report AI
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={cn("text-3xl font-bold leading-none", bandColor)}>{Math.round(p.index)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">/ 100 · {p.band}</div>
          </div>
        </div>

        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${Math.round(p.index)}%` }}
          />
        </div>

        {p.drivers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">What's driving this estimate</p>
            <div className="flex flex-wrap gap-2">
              {p.drivers.map((d) => (
                <span
                  key={d.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border",
                    d.direction === "up"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  )}
                >
                  {d.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {d.label} {d.direction === "up" ? "raises" : "lowers"} it
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-white/60 border border-white/40 p-2.5">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ridge linear regression · {p.dataset} · test R²={p.metrics.r2}, RMSE {p.metrics.rmse} (vs{" "}
            {p.metrics.baseline_rmse} for a no-model baseline). Based on {p.foundKeys.length} of {total} inputs
            found in your report; the rest use population averages. This is a research/education estimate of a
            progression index, <span className="font-medium">not a diagnosis</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
