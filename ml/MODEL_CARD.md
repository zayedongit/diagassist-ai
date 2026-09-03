# Model Card — DiagAssist risk models

Following the model-card framework (Mitchell et al., 2019). Covers the classical
ML models that run alongside the LLM in DiagAssist. Reproduce every number with
`python ml/train.py`.

## Model details

- **Owner / context:** DiagAssist (student project). Models trained offline, exported
  to JSON, and run as in-browser inference.
- **Models:**
  - *Diabetes progression* — Ridge linear **regression** (α=30, chosen by 5-fold CV).
  - *Diabetes, faster-than-typical* — **logistic regression** (C=1) with Platt calibration.
  - *Breast cancer, malignant* — **logistic regression** (C=1) with Platt calibration (standalone demo).
- **Inputs:** routine values (age, BMI, blood pressure, HDL, glucose) for the diabetes
  models; 30 fine-needle-aspirate cell measurements for breast cancer.
- **Training procedure:** standardized features; 75/25 train/test split; `GridSearchCV`
  for hyperparameters; probability calibration by out-of-fold Platt scaling.

## Intended use

- **Primary use:** an *educational, illustrative* second opinion that puts a quantitative,
  explainable number next to the LLM's plain-language explanation, and a teaching artifact
  for an ML portfolio.
- **Users:** the patient viewing their own DiagAssist result; reviewers of the project.
- **Out of scope:** clinical diagnosis, screening, triage, or any medical decision. These
  models must not be used to decide care. They are not medical devices and are not validated
  or regulated as such.

## Metrics

| Model | Metric | Value (held-out) | 95% CI (bootstrap) |
| --- | --- | --- | --- |
| Diabetes progression (reg.) | R² | 0.38 | [0.21, 0.51] |
| Diabetes progression (reg.) | RMSE | 58.6 (baseline 74.9) | — |
| Diabetes faster-than-typical | ROC-AUC | 0.78 | [0.69, 0.86] |
| Diabetes faster-than-typical | Brier | 0.19 (calibrated) | — |
| Breast cancer malignant | ROC-AUC | 0.996 | [0.989, 1.00] |
| Breast cancer malignant | Brier | 0.02 (calibrated) | — |

- **Decision threshold:** probabilities are shown calibrated; the default label uses 0.5.
  Each classifier also exports a high-sensitivity operating point (see the threshold charts) —
  the medically appropriate way to trade sensitivity against specificity.
- **Uncertainty:** metrics carry bootstrap 95% CIs; the diabetes CIs are wide, honestly
  reflecting a small test set and a genuinely hard target.

## Training & evaluation data

- **Diabetes:** scikit-learn diabetes dataset — 442 patients (Efron, Hastie, Johnstone &
  Tibshirani, 2004). Public benchmark.
- **Breast cancer:** Wisconsin diagnostic dataset — 569 samples, 30 features (Street et al., 1993).
- **No DiagAssist user data is used for training**, by design — only these public datasets.
- Evaluation is a held-out split from the same dataset plus 5-fold cross-validation.

## Ethical considerations

- **Not a diagnosis.** Every surface labels the output as research/education, not medical advice.
- **No training on patient data.** Avoids consent, privacy, and re-identification concerns.
- **Calibrated probabilities.** So a stated confidence is not misleadingly over- or under-stated.
- **Transparency.** Per-feature contributions are shown, so a prediction is never an opaque number.

## Caveats & limitations

- **Population representativeness.** The training cohorts are decades old and not Indian
  populations; DiagAssist targets Indian users. Generalization to that population is **unvalidated**,
  which is precisely why the LLM explanations are grounded in an India-first source corpus while
  these models are presented as illustrative, not authoritative.
- **Modest accuracy on a hard target.** The diabetes progression signal is inherently noisy
  (R² ≈ 0.38); the model beats a no-model baseline but is far from deterministic.
- **Feature availability.** A real report rarely contains all inputs; missing values fall back to
  population means, disclosed on the card — this widens real-world uncertainty beyond the metrics above.
- **Breast cancer model is a pipeline demonstration**, not integrated into report analysis (its
  inputs are biopsy measurements, not blood tests).
- **Small test sets.** See the wide bootstrap CIs; treat point estimates with corresponding caution.
