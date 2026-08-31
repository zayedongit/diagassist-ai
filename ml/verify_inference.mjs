/**
 * Dependency-free regression test for the exported ML models.
 * Mirrors src/lib/riskModel.ts inference math and asserts the committed model
 * files produce sensible, stable predictions. Run: `node ml/verify_inference.mjs`
 * Exit code 0 = pass, 1 = fail (usable as a CI gate).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(readFileSync(resolve(HERE, "../src/ml/diabetes_progression.json"), "utf8"));
const C = JSON.parse(readFileSync(resolve(HERE, "../src/ml/diabetes_progression_class.json"), "utf8"));
const sig = (t) => 1 / (1 + Math.exp(-t));

function predict(inputs) {
  const { mean, std } = R.standardize;
  let score = R.intercept, found = 0;
  const x = [];
  R.features.forEach((f, i) => {
    let raw = inputs[f.key];
    if (raw == null || Number.isNaN(raw)) { x[i] = R.impute_with[i]; }
    else { x[i] = raw; found++; }
    score += R.coef[i] * ((x[i] - mean[i]) / (std[i] || 1));
  });
  const { p05, p95 } = R.target;
  const index = Math.max(0, Math.min(100, (100 * (score - p05)) / (p95 - p05)));
  let logit = C.intercept;
  C.features.forEach((_f, i) => { logit += C.coef[i] * ((x[i] - C.standardize.mean[i]) / (C.standardize.std[i] || 1)); });
  const cal = C.calibration ?? { A: 1, B: 0 };
  const prob = sig(cal.A * logit + cal.B);
  return { index, prob, label: prob >= 0.5 ? "faster" : "slower", found, available: found >= 2 };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); }
  else { console.log(`  ✗ ${name} — ${detail}`); failures++; }
}

console.log("Model files:");
console.log(`  regression: ${R.model}  (test R²=${R.metrics.r2}, RMSE ${R.metrics.rmse})`);
console.log(`  classifier: ${C.model}  (AUC ${C.metrics.auc}, Brier ${C.metrics.brier_after_cal ?? C.metrics.brier_before_cal})`);
console.log("Assertions:");

// contract: metrics haven't silently regressed
check("regression R² >= 0.33", R.metrics.r2 >= 0.33, `got ${R.metrics.r2}`);
check("classifier AUC >= 0.72", C.metrics.auc >= 0.72, `got ${C.metrics.auc}`);
check("model beats no-model baseline", R.metrics.rmse < R.metrics.baseline_rmse, `${R.metrics.rmse} !< ${R.metrics.baseline_rmse}`);
check("5 features, aligned coef/standardize", R.features.length === 5 && R.coef.length === 5 && R.standardize.mean.length === 5, "length mismatch");
check("calibration params present", C.calibration && typeof C.calibration.A === "number", "missing calibration");

// behaviour: high-risk vs healthy vs sparse
const hi = predict({ glucose: 190, hdl: 32, age: 58, bmi: 31, bp: 95 });
const lo = predict({ glucose: 88, hdl: 62, age: 30 });
const sparse = predict({ glucose: 160, hdl: 40 });
const one = predict({ glucose: 200 });
console.log(`  [hi]=${JSON.stringify({i:Math.round(hi.index),p:+hi.prob.toFixed(2),l:hi.label})} [lo]=${JSON.stringify({i:Math.round(lo.index),p:+lo.prob.toFixed(2),l:lo.label})}`);
check("high-risk index > healthy index", hi.index > lo.index, `${hi.index} !> ${lo.index}`);
check("high-risk classified faster", hi.label === "faster", hi.label);
check("healthy classified slower", lo.label === "slower", lo.label);
check("high-risk prob > 0.6", hi.prob > 0.6, `${hi.prob}`);
check("healthy prob < 0.5", lo.prob < 0.5, `${lo.prob}`);
check("2 inputs => available", sparse.available === true, "not available");
check("1 input => unavailable in UI", one.available === false, "unexpectedly available");
check("probabilities in [0,1]", [hi,lo,sparse].every(r => r.prob >= 0 && r.prob <= 1), "out of range");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
