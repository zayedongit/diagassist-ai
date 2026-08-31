"""DiagAssist ML — train + evaluate clinical risk models, export weights to JSON
for edge/browser serving.

Design: a MODELS registry. Adding a disease = add one entry (a loader + feature
specs). Today: diabetes progression (scikit-learn diabetes dataset, bundled).
Tomorrow: point a loader at a CSV for CKD / heart disease and it drops right in.

Run:
  python ml/train.py                # train every registered model
  python ml/train.py diabetes       # just one
Outputs per model:
  src/ml/<task>.json                # weights + metrics + metadata (app imports this)
  ml/report/charts/<task>_*.png     # predicted-vs-actual + feature-importance charts
"""
import json, sys, os
import numpy as np
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

RNG = 42
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MODEL_OUT = os.path.join(ROOT, "src", "ml")
CHART_OUT = os.path.join(HERE, "report", "charts")


def load_diabetes_progression():
    from sklearn.datasets import load_diabetes
    raw = load_diabetes(scaled=False, as_frame=True).frame
    # Clinically-interpretable subset. Total cholesterol dropped (collinear with
    # LDL+HDL -> unstable, backwards signs); sex dropped (unknown 1/2 coding);
    # s4 ratio + s5 log-trig dropped (ambiguous units for serving).
    feats = [
        ("age", "Age", "years", "age"),
        ("bmi", "BMI", "kg/m2", "bmi"),
        ("bp",  "Blood pressure", "mmHg", "bp"),
        ("s2",  "LDL cholesterol", "mg/dL", "ldl"),
        ("s3",  "HDL cholesterol", "mg/dL", "hdl"),
        ("s6",  "Blood glucose", "mg/dL", "glucose"),
    ]
    X = raw[[f[0] for f in feats]].to_numpy(float)
    y = raw["target"].to_numpy(float)
    return X, y, feats, {
        "dataset": "scikit-learn diabetes dataset (442 patients; Efron, Hastie, Johnstone & Tibshirani, 2004)",
        "target_name": "diabetes disease progression, 1 year after baseline",
        "task": "diabetes_progression",
    }


MODELS = {"diabetes": load_diabetes_progression}


def train_one(key):
    X, y, feats, meta = MODELS[key]()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=RNG)
    mean = Xtr.mean(0); std = Xtr.std(0); std[std == 0] = 1
    Ztr, Zte = (Xtr - mean) / std, (Xte - mean) / std
    Zall = (X - mean) / std

    def ev(model, name):
        model.fit(Ztr, ytr); p = model.predict(Zte)
        cv = cross_val_score(model, Zall, y, cv=5, scoring="r2")
        return dict(name=name, r2=r2_score(yte, p), rmse=mean_squared_error(yte, p) ** 0.5,
                    mae=mean_absolute_error(yte, p), cv=cv.mean(), cvs=cv.std(), pred=p)

    base_rmse = mean_squared_error(yte, np.full_like(yte, ytr.mean())) ** 0.5
    ridge = ev(Ridge(alpha=1.0), "Ridge linear regression")
    ols = ev(LinearRegression(), "OLS linear regression")
    rf = ev(RandomForestRegressor(n_estimators=300, random_state=RNG), "Random forest")
    print(f"[{key}] baseline RMSE={base_rmse:.1f}")
    for m in (ridge, ols, rf):
        print(f"       {m['name']:26s} R2={m['r2']:.3f} RMSE={m['rmse']:.1f} MAE={m['mae']:.1f} CV-R2={m['cv']:.3f}±{m['cvs']:.3f}")

    final = Ridge(alpha=1.0).fit(Zall, y)
    preds_all = final.predict(Zall)
    p05, p95 = np.percentile(preds_all, [5, 95])
    imp = sorted([{"feature": feats[i][3], "label": feats[i][1], "std_coef": float(final.coef_[i])}
                  for i in range(len(feats))], key=lambda d: abs(d["std_coef"]), reverse=True)

    model_json = {
        "task": meta["task"], "model": "ridge_linear_regression", "dataset": meta["dataset"],
        "target": {"name": meta["target_name"], "min": float(y.min()), "max": float(y.max()),
                   "mean": float(y.mean()), "p05": float(p05), "p95": float(p95)},
        "features": [{"key": f[3], "label": f[1], "unit": f[2]} for f in feats],
        "standardize": {"mean": mean.round(6).tolist(), "std": std.round(6).tolist()},
        "coef": final.coef_.round(6).tolist(), "intercept": float(round(final.intercept_, 6)),
        "impute_with": mean.round(6).tolist(), "feature_importance": imp,
        "metrics": {"r2": round(ridge["r2"], 4), "rmse": round(ridge["rmse"], 2), "mae": round(ridge["mae"], 2),
                    "cv_r2_mean": round(ridge["cv"], 4), "cv_r2_std": round(ridge["cvs"], 4),
                    "baseline_rmse": round(base_rmse, 2)},
        "n_train": int(len(ytr)), "n_test": int(len(yte)), "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    os.makedirs(MODEL_OUT, exist_ok=True)
    with open(os.path.join(MODEL_OUT, f"{meta['task']}.json"), "w") as f:
        json.dump(model_json, f, indent=2)

    # charts
    os.makedirs(CHART_OUT, exist_ok=True)
    plt.figure(figsize=(4.6, 4.6))
    plt.scatter(yte, ridge["pred"], s=18, alpha=0.6, edgecolor="none")
    lo, hi = min(yte.min(), ridge["pred"].min()), max(yte.max(), ridge["pred"].max())
    plt.plot([lo, hi], [lo, hi], "k--", lw=1)
    plt.xlabel("Actual progression"); plt.ylabel("Predicted"); plt.title(f"{key}: predicted vs actual (R2={ridge['r2']:.2f})")
    plt.tight_layout(); plt.savefig(os.path.join(CHART_OUT, f"{meta['task']}_pred_vs_actual.png"), dpi=120); plt.close()

    labels = [d["label"] for d in imp][::-1]; vals = [d["std_coef"] for d in imp][::-1]
    plt.figure(figsize=(5.2, 3.6))
    plt.barh(labels, vals, color=["#c0392b" if v > 0 else "#2980b9" for v in vals])
    plt.axvline(0, color="k", lw=0.8); plt.xlabel("Standardized coefficient (red=raises, blue=lowers)")
    plt.title(f"{key}: feature importance"); plt.tight_layout()
    plt.savefig(os.path.join(CHART_OUT, f"{meta['task']}_feature_importance.png"), dpi=120); plt.close()
    print(f"       wrote src/ml/{meta['task']}.json + 2 charts")
    return model_json


if __name__ == "__main__":
    keys = sys.argv[1:] or list(MODELS)
    for k in keys:
        if k not in MODELS: print(f"unknown model '{k}' (have: {list(MODELS)})"); continue
        train_one(k)
