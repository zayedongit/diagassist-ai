/**
 * DiagAssist — client-side inference for the trained ML risk models.
 *
 * We train offline (see ml/train.py) and export the model's weights to
 * src/ml/<task>.json. Because the model we ship is a linear (Ridge) regression,
 * inference is just standardize -> dot product -> map to a 0-100 index, so it
 * runs in the browser with no backend and no API call.
 *
 * The signed per-feature contributions give built-in explainability ("what is
 * driving this estimate"), and missing report values fall back to the dataset's
 * population means so a partial report still yields an estimate — transparently.
 */
import type { EnhancedAnalysisResult } from "@/types/medicalAnalysis";
import diabetesModel from "@/ml/diabetes_progression.json";
import diabetesClassModel from "@/ml/diabetes_progression_class.json";

export interface RiskModelJSON {
  task: string;
  model: string;
  dataset: string;
  target: { name: string; min: number; max: number; mean: number; p05: number; p95: number };
  features: { key: string; label: string; unit: string }[];
  standardize: { mean: number[]; std: number[] };
  coef: number[];
  intercept: number;
  impute_with: number[];
  feature_importance: { feature: string; label: string; std_coef: number }[];
  metrics: { r2: number; rmse: number; mae: number; cv_r2_mean: number; cv_r2_std: number; baseline_rmse: number };
  n_train: number;
  n_test: number;
  trained_at: string;
}

export interface ClassModelJSON {
  task: string;
  model: string;
  positive_class: string;
  threshold_target: number;
  features: { key: string; label: string; unit: string }[];
  standardize: { mean: number[]; std: number[] };
  coef: number[];
  intercept: number;
  impute_with: number[];
  metrics: { auc: number; accuracy: number; precision: number; recall: number; f1: number; cv_auc_mean: number; cv_auc_std: number };
  n_train: number;
  n_test: number;
}

export interface RiskDriver { label: string; contribution: number; direction: "up" | "down"; }

export interface RiskPrediction {
  available: boolean;
  index: number;               // 0-100, mapped across the dataset's 5th-95th pct
  score: number;               // raw predicted progression score
  band: "Lower" | "Moderate" | "Higher";
  foundKeys: string[];         // features read from the report
  imputedKeys: string[];       // features filled with population averages
  drivers: RiskDriver[];       // top contributors among the found features
  metrics: RiskModelJSON["metrics"];
  dataset: string;
  targetName: string;
  // classification head (logistic regression on the same features)
  probFaster: number;          // P(faster-than-typical progression), 0-1
  classLabel: "faster" | "slower";
  classAuc: number;            // validation AUC of the classifier
}

const M = diabetesModel as RiskModelJSON;
const C = diabetesClassModel as ClassModelJSON;

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const m = String(v).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function findLab(result: EnhancedAnalysisResult, patterns: RegExp[]): number | null {
  const labs = [
    ...((result.medicalPanels?.flatMap((p) => p.abnormalLabs || []) || []) as any[]),
    ...(((result as any).labs || []) as any[]),
  ];
  for (const lab of labs) {
    const name = String(lab?.name || "").toLowerCase();
    if (patterns.some((re) => re.test(name))) {
      const n = parseNum(lab?.value);
      if (n != null) return n;
    }
  }
  return null;
}

const EXTRACTORS: Record<string, (r: EnhancedAnalysisResult) => number | null> = {
  age: (r) => (typeof r.demographics?.age === "number" ? (r.demographics!.age as number) : null),
  bmi: (r) => findLab(r, [/\bbmi\b/, /body mass/]),
  bp: (r) => findLab(r, [/blood pressure/, /\bbp\b/, /systolic/]),
  hdl: (r) => findLab(r, [/\bhdl\b/]),
  glucose: (r) => findLab(r, [/glucose/, /fasting sugar/, /\bfbs\b/, /blood sugar/]),
};

export function predictDiabetesProgression(result: EnhancedAnalysisResult): RiskPrediction {
  const { mean, std } = M.standardize;
  const foundKeys: string[] = [];
  const imputedKeys: string[] = [];
  let score = M.intercept;
  const xVals: number[] = [];
  const contribs: { label: string; c: number }[] = [];

  M.features.forEach((f, i) => {
    const raw = EXTRACTORS[f.key]?.(result) ?? null;
    let x: number;
    if (raw == null || Number.isNaN(raw)) {
      x = M.impute_with[i];
      imputedKeys.push(f.key);
    } else {
      x = raw;
      foundKeys.push(f.key);
    }
    xVals[i] = x;
    const z = (x - mean[i]) / (std[i] || 1);
    const c = M.coef[i] * z;
    score += c;
    if (raw != null && !Number.isNaN(raw)) contribs.push({ label: f.label, c });
  });

  const { p05, p95 } = M.target;
  const index = Math.max(0, Math.min(100, (100 * (score - p05)) / (p95 - p05)));
  const band: RiskPrediction["band"] = index < 40 ? "Lower" : index < 70 ? "Moderate" : "Higher";

  const drivers: RiskDriver[] = contribs
    .filter((c) => Math.abs(c.c) > 0.5)
    .sort((a, b) => Math.abs(b.c) - Math.abs(a.c))
    .slice(0, 4)
    .map((c) => ({ label: c.label, contribution: c.c, direction: c.c >= 0 ? "up" : "down" }));

  // classification head: P(faster-than-typical progression) via logistic regression
  let logit = C.intercept;
  C.features.forEach((_f, i) => {
    logit += C.coef[i] * ((xVals[i] - C.standardize.mean[i]) / (C.standardize.std[i] || 1));
  });
  const probFaster = 1 / (1 + Math.exp(-logit));
  const classLabel: RiskPrediction["classLabel"] = probFaster >= 0.5 ? "faster" : "slower";

  return {
    available: foundKeys.length >= 2,
    index,
    score,
    band,
    foundKeys,
    imputedKeys,
    drivers,
    metrics: M.metrics,
    dataset: M.dataset,
    targetName: M.target.name,
    probFaster,
    classLabel,
    classAuc: C.metrics.auc,
  };
}
