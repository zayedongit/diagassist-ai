# ML charts — study index

Every PNG this project generates, with a 1–2 line explainer. Regenerate them all
with `python ml/train.py`. Grouped by model.

## How to read them (quick primer)
- **ROC curve** — trades off true-positives vs false-positives across thresholds;
  area under it (**AUC**) is 0.5 (random) to 1.0 (perfect).
- **Confusion matrix** — counts of correct/incorrect calls on held-out data
  (diagonal = correct).
- **Reliability / calibration curve** — are predicted probabilities honest? Points
  on the diagonal mean "70% predicted → 70% actually happen". **Brier** score lower = better.
- **Precision-recall (PR) curve** — like ROC but focuses on the positive class;
  **AP** = average precision.
- **Learning curve** — training vs cross-validation score as data grows. A small
  gap = low overfitting; a plateau = more data won't help much.
- **Feature / permutation importance** — which inputs matter. Coefficients show the
  linear model's weights; permutation importance measures the score drop when a
  feature is shuffled (model-agnostic, more robust).

---

## Diabetes progression (regression + classification) — scikit-learn diabetes, 442 patients

- **diabetes_progression_pred_vs_actual.png** — Regression fit on held-out patients:
  predicted vs actual progression. Clustering near the diagonal = good. R² ≈ 0.38.
- **diabetes_progression_feature_importance.png** — Ridge standardized coefficients:
  BMI, blood pressure and glucose raise the estimate; HDL lowers it (protective).
- **diabetes_progression_learning_curve.png** — Training vs cross-val R² as data grows;
  the two converge near 0.40 → low overfitting and the model has plateaued (limited by
  features, not data volume).
- **diabetes_progression_permutation_importance.png** — Drop in R² when each feature is
  shuffled; a more robust importance ranking than raw coefficients.
- **diabetes_progression_residuals.png** — Residuals (actual − predicted) vs predicted;
  scattered around 0 with no pattern = well-behaved, unbiased errors.
- **diabetes_progression_class_roc.png** — Classifier (faster-vs-slower progression) ROC,
  AUC ≈ 0.78.
- **diabetes_progression_class_confusion.png** — Held-out confusion matrix: 40 true-neg /
  39 true-pos with 16/16 errors — balanced.
- **diabetes_progression_class_calibration.png** — Reliability curve (raw vs Platt-calibrated);
  both hug the diagonal, Brier ≈ 0.19 → probabilities were already trustworthy.
- **diabetes_progression_class_pr.png** — Precision-recall curve for the classifier with its
  average-precision (AP) score.

## Breast cancer (classification) — scikit-learn breast cancer Wisconsin, 569 samples

Standalone ML demonstration (biopsy cell measurements, not lab-report values), showing the
same trainer generalizes to a new disease. Near-perfect separation.

- **breast_cancer_malignant_roc.png** — ROC for detecting malignant tumours, AUC ≈ 0.996.
- **breast_cancer_malignant_confusion.png** — Held-out confusion matrix; very few misses.
- **breast_cancer_malignant_calibration.png** — Reliability curve; Brier ≈ 0.02 (excellent).
- **breast_cancer_malignant_pr.png** — Precision-recall curve with a high AP.
- **breast_cancer_malignant_permutation_importance.png** — Top-12 features by AUC drop;
  worst-symmetry, worst-texture and worst-concavity lead.
- **breast_cancer_malignant_learning_curve.png** — Training vs cross-val AUC; both high and
  converged → strong, stable model.
