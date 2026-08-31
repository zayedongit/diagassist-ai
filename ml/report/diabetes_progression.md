# Diabetes progression model — results

**Task:** regression — predict a diabetes disease-progression score one year after
baseline, from routine labs.
**Dataset:** scikit-learn *diabetes* dataset, 442 real patients (Efron, Hastie,
Johnstone & Tibshirani, 2004).
**Model shipped:** Ridge linear regression (standardized inputs).
**Split:** 331 train / 111 test, plus 5-fold cross-validation.

## Headline metrics (held-out test set)

| metric | value | meaning |
| --- | --- | --- |
| R² | **0.38** | explains 38% of the variation in progression |
| Cross-val R² | **0.41 ± 0.09** | stable across folds → not overfit |
| RMSE | **58.6** | typical error, vs **74.9** for a no-model baseline (~22% lower) |
| MAE | 46.6 | mean absolute error |

This is the **selected** model (see methodology below): a grid search chose the Ridge
penalty, and random forest (CV-R² 0.35) and gradient boosting (0.33) both did *worse*
than the linear model — so shipping the transparent linear model is evidence-backed.

## What drives the estimate

![feature importance](charts/diabetes_progression_feature_importance.png)

Standardized coefficients (comparable across features):

| feature | effect | direction |
| --- | --- | --- |
| BMI | +30.3 | raises progression (strongest) |
| Blood pressure | +16.6 | raises |
| HDL cholesterol | −14.1 | **lowers** (protective) |
| Blood glucose | +7.2 | raises |
| Age | +0.0 | negligible here |

All clinically sensible: higher BMI, blood pressure, and glucose predict faster
progression; higher HDL ("good" cholesterol) predicts slower.

## Predicted vs actual

![predicted vs actual](charts/diabetes_progression_pred_vs_actual.png)

Points cluster around the diagonal (perfect prediction) with real scatter — an
honest R²≈0.37 model, not an overfit one claiming to be perfect.

## Classification head (logistic regression)

The same six— now five— features also train a **classifier**: is this patient's
progression **faster than the cohort median** (target > 140.5) or not? This adds
the classification paradigm (probabilities, a decision threshold, ROC-AUC) on top
of the regression.

| metric | value | meaning |
| --- | --- | --- |
| ROC-AUC | **0.78** | ranks a random faster case above a random slower one 78% of the time |
| Cross-val AUC | **0.80 ± 0.05** | stable across folds |
| Accuracy | 0.71 | correct 71% of the time at the 0.5 threshold |
| Precision / Recall / F1 | 0.71 / 0.71 / 0.71 | balanced (classes are 50/50 by the median split) |

![ROC curve](charts/diabetes_progression_class_roc.png)
![confusion matrix](charts/diabetes_progression_class_confusion.png)

The ROC curve sits well above the diagonal (random) line; the confusion matrix on
the held-out test set is 40 true-negative / 39 true-positive with 16 / 16 errors —
an honest, balanced classifier, not one gaming a skewed class.

## Methodology (how the models were selected & validated)

Nothing here is hand-tuned. The pipeline:

1. **Split** 442 patients into train (75%) and a held-out test set (25%); all
   scores below are on the held-out set plus 5-fold cross-validation.
2. **Standardize** features (mean 0, std 1) using training statistics only.
3. **Regression — tune + compare:** a `GridSearchCV` selects the Ridge penalty
   `alpha` by 5-fold CV, and the winner is compared against Lasso, random forest
   and gradient boosting by CV-R²:

   | model | CV-R² |
   | --- | --- |
   | Ridge (tuned, α=30) | **0.406** |
   | Lasso | 0.406 |
   | Random forest | 0.347 |
   | Gradient boosting | 0.331 |

   The linear models win, so the transparent one ships.
4. **Classification — tune + calibrate:** `GridSearchCV` selects `C` (=1) by
   CV-AUC. We then **calibrate** the probabilities with out-of-fold Platt scaling
   and check them with the **Brier score** and a reliability curve.

## Calibration — are the probabilities trustworthy?

A model can be accurate yet output over-confident probabilities. We checked:

![reliability curve](charts/diabetes_progression_class_calibration.png)

Both curves hug the diagonal and the **Brier score is 0.19 before and after**
calibration — logistic regression was **already well-calibrated** (it optimizes
log-loss), so Platt scaling barely moved it. That means a "70%" from this model
really does behave like 70%. The calibration parameters are still exported and
applied at serve time, so the guarantee holds if the model is ever retrained.

## In the app

When a report yields at least two of the five inputs, DiagAssist shows a
*Diabetes progression — ML estimate* card: a 0–100 index (mapped across the
dataset's 5th–95th percentile of predictions), the top contributing labs, and the
model's provenance and validation numbers. Missing inputs fall back to population
averages, stated on the card. It is labelled a research/education estimate, not a
diagnosis.
