# DiagAssist ML — trained clinical risk models

A classical machine-learning layer that sits **alongside** the LLM report. The
LLM explains a report in plain language; these models add a **quantitative,
explainable risk estimate** trained on a real patient dataset. Today: diabetes disease-progression, as BOTH a **regression** (how fast) and a
**classification** (faster-than-typical or not). The trainer is a registry, so
adding a disease is one entry.

## What's here

```
ml/
  train.py                 # trains + evaluates every registered model, exports weights
  report/
    charts/                # predicted-vs-actual + feature-importance PNGs
    diabetes_progression.md# written-up results (regression + classification) + how to read them
src/ml/
  diabetes_progression.json      # regression model (weights + metrics), imported by the app
  diabetes_progression_class.json# classification model (logistic regression)
src/lib/riskModel.ts       # browser inference (standardize -> dot product -> 0-100 index)
src/components/RiskProjectionCard.tsx  # the UI card
```

## Retrain

```bash
pip install scikit-learn pandas numpy matplotlib
python ml/train.py            # all models
python ml/train.py diabetes   # just one
```

This rewrites `src/ml/diabetes_progression.json` and the charts. The app picks up
the new weights on the next build — no server, no redeploy: the shipped model is
a linear regression, so inference is a dot product done in the browser.

## The diabetes model (in plain terms)

- **Dataset:** the scikit-learn *diabetes* dataset — 442 real patients (Efron,
  Hastie, Johnstone & Tibshirani, 2004). Public, standard ML benchmark.
- **Task:** *regression* — predict a continuous "disease progression one year
  later" score from baseline measurements. (Regression = predict a number, vs
  classification = predict a category.)
- **Inputs (features):** age, BMI, blood pressure, HDL, blood glucose — all
  values a lab report provides, so the model plugs straight into DiagAssist.
- **Model:** Ridge linear regression. Ridge = linear regression with a penalty
  that keeps the coefficients small and stable (helps when inputs are correlated,
  like cholesterol values are).
- **Why linear:** on this data a random forest did no better (R²≈0.35 vs 0.36),
  and a linear model is transparent and trivial to serve. We keep the honest,
  interpretable one.

## How the numbers are made

1. Split the 442 patients into a **training set** (used to fit the model) and a
   held-out **test set** (used only to score it) — so we measure how it does on
   patients it never saw. This is how you catch **overfitting** (a model that
   memorises training data but fails on new data).
2. **Standardize** each input (subtract mean, divide by std) so features on
   different scales are comparable.
3. **Tune, don't guess:** a grid search picks the Ridge penalty (and the
   logistic-regression C) by cross-validation, and the winner is compared against
   random forest / gradient boosting so the model choice is evidence-backed.
4. Fit the selected model; read off a coefficient per feature.
5. Score on the test set and with **5-fold cross-validation** (rotate which fifth
   is held out, five times — a more robust estimate than a single split).
6. **Calibrate the classifier:** apply out-of-fold Platt scaling and check the
   probabilities with the Brier score + a reliability curve, so a "70%" behaves
   like 70%.

## Reading the metrics

- **R² (0–1):** share of the variation in progression the model explains. 0 = no
  better than guessing the average; 1 = perfect. Ours ≈ **0.37** (CV ≈ 0.41).
- **RMSE / MAE:** typical prediction error in the target's own units — lower is
  better. Ours RMSE ≈ **59** vs a no-model baseline of **75**, i.e. ~21% less error.
- **ROC-AUC (classifier, 0.5–1):** how well the classifier ranks a faster case
  above a slower one. 0.5 = random, 1 = perfect. Ours ≈ **0.78** (CV ≈ 0.80).
- **Confusion matrix:** counts of correct/incorrect calls on held-out patients.
- **Brier score (0–1, lower better):** probability quality/calibration. Ours ≈ **0.19**,
  unchanged by calibration → the logistic model was already well-calibrated.
- **Feature importance (standardized coefficients):** how strongly each input
  moves the estimate, on a comparable scale. Positive = raises the estimate.
  Here: **BMI** and **blood pressure** raise it most, **HDL** lowers it (protective),
  glucose raises it — all clinically sensible.

## Honesty notes (say these in a viva — examiners respect them)

- We dropped *total cholesterol* and *LDL* as inputs: total cholesterol ≈ LDL + HDL
  + …, and LDL is correlated with HDL, so keeping them made the coefficients
  unstable and gave LDL a backwards (protective) sign — **multicollinearity**.
  Removing them actually *raised* R² slightly and made every remaining driver
  clinically correct. Interpretability over a vanity number.
- R² ≈ 0.37 is honest for this dataset — its known linear ceiling is ~0.5. We
  report the held-out and cross-validated scores, not the training score.
- Training uses only this **public** dataset. No patient data from DiagAssist is
  used to train — which is also the ethically correct choice.
- The output is a research/education **progression index**, not a diagnosis.

## Add another disease

1. Get a public dataset (e.g. UCI Chronic Kidney Disease, UCI Heart Disease).
2. Add a loader + feature list to the `MODELS` registry in `ml/train.py`.
3. `python ml/train.py <name>` → exports `src/ml/<task>.json`.
4. Add an extractor + a card (mirror `riskModel.ts` / `RiskProjectionCard.tsx`).
