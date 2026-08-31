"""DiagAssist ML — train + evaluate clinical risk models, export weights to JSON
for in-browser serving.

Rigorous pipeline (per model):
  Regression (how fast progression is):
    - GridSearchCV to tune the Ridge penalty (alpha) by 5-fold CV
    - honest comparison vs Lasso / RandomForest / GradientBoosting (CV R^2)
    - held-out test R^2 / RMSE / MAE, plus a residual-based uncertainty band
  Classification (faster-than-typical or not):
    - GridSearchCV to tune LogisticRegression C by 5-fold CV (ROC-AUC)
    - Platt probability CALIBRATION (so the % is trustworthy), fit out-of-fold;
      Brier score reported before vs after; reliability curve saved
    - ROC-AUC, confusion matrix, precision/recall/F1

Design: a MODELS registry. Adding a disease = add one loader entry.
Run:  python ml/train.py [diabetes]
Outputs: src/ml/<task>.json, src/ml/<task>_class.json, ml/report/charts/*.png
"""
import json, sys, os
import numpy as np
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, cross_val_predict
from sklearn.linear_model import Ridge, Lasso, LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import (r2_score, mean_squared_error, mean_absolute_error, roc_auc_score,
    roc_curve, confusion_matrix, precision_score, recall_score, f1_score, accuracy_score,
    brier_score_loss)
from sklearn.calibration import calibration_curve
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt

RNG = 42
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
MODEL_OUT = os.path.join(ROOT, "src", "ml"); CHART_OUT = os.path.join(HERE, "report", "charts")
sig = lambda t: 1 / (1 + np.exp(-t))


def load_diabetes_progression():
    from sklearn.datasets import load_diabetes
    raw = load_diabetes(scaled=False, as_frame=True).frame
    # Clinically-interpretable subset. Total cholesterol AND LDL dropped (collinear
    # -> unstable coefficients; LDL got a backwards protective sign); sex dropped
    # (unknown 1/2 coding); s4 ratio + s5 log-trig dropped (ambiguous units).
    feats = [("age","Age","years","age"),("bmi","BMI","kg/m2","bmi"),("bp","Blood pressure","mmHg","bp"),
             ("s3","HDL cholesterol","mg/dL","hdl"),("s6","Blood glucose","mg/dL","glucose")]
    X = raw[[f[0] for f in feats]].to_numpy(float); y = raw["target"].to_numpy(float)
    return X, y, feats, {"dataset":"scikit-learn diabetes dataset (442 patients; Efron, Hastie, Johnstone & Tibshirani, 2004)",
                         "target_name":"diabetes disease progression, 1 year after baseline","task":"diabetes_progression"}


MODELS = {"diabetes": load_diabetes_progression}


def train_one(key):
    X, y, feats, meta = MODELS[key](); task = meta["task"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=RNG)
    mean = Xtr.mean(0); std = Xtr.std(0); std[std == 0] = 1
    Ztr, Zte, Zall = (Xtr-mean)/std, (Xte-mean)/std, (X-mean)/std

    # ---- REGRESSION: tune alpha by CV, compare families ----
    grid = GridSearchCV(Ridge(), {"alpha": [0.03,0.1,0.3,1,3,10,30,100]}, cv=5, scoring="r2")
    grid.fit(Ztr, ytr); best_alpha = grid.best_params_["alpha"]
    cmp = {}
    for name, est in {"Ridge(tuned)": Ridge(alpha=best_alpha), "Lasso": Lasso(alpha=0.1, max_iter=5000),
                      "RandomForest": RandomForestRegressor(n_estimators=300, random_state=RNG),
                      "GradientBoosting": GradientBoostingRegressor(random_state=RNG)}.items():
        cmp[name] = float(cross_val_score(est, Zall, y, cv=5, scoring="r2").mean())
    reg = Ridge(alpha=best_alpha).fit(Ztr, ytr); pte = reg.predict(Zte)
    r2 = r2_score(yte, pte); rmse = mean_squared_error(yte, pte) ** 0.5; mae = mean_absolute_error(yte, pte)
    cvr2 = cross_val_score(Ridge(alpha=best_alpha), Zall, y, cv=5, scoring="r2")
    base_rmse = mean_squared_error(yte, np.full_like(yte, ytr.mean())) ** 0.5
    resid_std = float(np.std(yte - pte))
    print(f"[{key}] REGRESSION  best_alpha={best_alpha}  test R2={r2:.3f} RMSE={rmse:.1f} (baseline {base_rmse:.1f})  CV-R2={cvr2.mean():.3f}±{cvr2.std():.3f}")
    print("        CV-R2 by family:", {k: round(v,3) for k,v in cmp.items()})

    final = Ridge(alpha=best_alpha).fit(Zall, y)
    preds_all = final.predict(Zall); p05, p95 = np.percentile(preds_all, [5, 95])
    imp = sorted([{"feature":feats[i][3],"label":feats[i][1],"std_coef":float(final.coef_[i])} for i in range(len(feats))],
                 key=lambda d: abs(d["std_coef"]), reverse=True)
    reg_json = {"task":task,"model":f"ridge_linear_regression(alpha={best_alpha})","dataset":meta["dataset"],
        "target":{"name":meta["target_name"],"min":float(y.min()),"max":float(y.max()),"mean":float(y.mean()),"p05":float(p05),"p95":float(p95)},
        "features":[{"key":f[3],"label":f[1],"unit":f[2]} for f in feats],
        "standardize":{"mean":mean.round(6).tolist(),"std":std.round(6).tolist()},
        "coef":final.coef_.round(6).tolist(),"intercept":float(round(final.intercept_,6)),
        "impute_with":mean.round(6).tolist(),"feature_importance":imp,
        "uncertainty":{"resid_std":round(resid_std,2),"index_band":round(100*resid_std/(p95-p05),1)},
        "selection":{"best_alpha":best_alpha,"cv_r2_by_family":{k:round(v,4) for k,v in cmp.items()}},
        "metrics":{"r2":round(r2,4),"rmse":round(rmse,2),"mae":round(mae,2),"cv_r2_mean":round(cvr2.mean(),4),
                   "cv_r2_std":round(cvr2.std(),4),"baseline_rmse":round(base_rmse,2)},
        "n_train":int(len(ytr)),"n_test":int(len(yte)),"trained_at":datetime.now(timezone.utc).isoformat()}
    os.makedirs(MODEL_OUT, exist_ok=True); json.dump(reg_json, open(os.path.join(MODEL_OUT,f"{task}.json"),"w"), indent=2)

    # regression charts
    os.makedirs(CHART_OUT, exist_ok=True)
    plt.figure(figsize=(4.6,4.6)); plt.scatter(yte, pte, s=18, alpha=0.6, edgecolor="none")
    lo,hi = min(yte.min(),pte.min()), max(yte.max(),pte.max()); plt.plot([lo,hi],[lo,hi],"k--",lw=1)
    plt.xlabel("Actual progression"); plt.ylabel("Predicted"); plt.title(f"{key}: predicted vs actual (R2={r2:.2f})")
    plt.tight_layout(); plt.savefig(os.path.join(CHART_OUT,f"{task}_pred_vs_actual.png"), dpi=120); plt.close()
    lbl=[d["label"] for d in imp][::-1]; val=[d["std_coef"] for d in imp][::-1]
    plt.figure(figsize=(5.2,3.6)); plt.barh(lbl,val,color=["#c0392b" if v>0 else "#2980b9" for v in val])
    plt.axvline(0,color="k",lw=0.8); plt.xlabel("Standardized coefficient (red=raises, blue=lowers)")
    plt.title(f"{key}: feature importance"); plt.tight_layout()
    plt.savefig(os.path.join(CHART_OUT,f"{task}_feature_importance.png"), dpi=120); plt.close()

    # ---- CLASSIFICATION: tune C, calibrate (Platt), Brier before/after ----
    thr = float(np.median(y)); yb = (y > thr).astype(int)
    cXtr,cXte,cytr,cyte = train_test_split(X, yb, test_size=0.25, random_state=RNG, stratify=yb)
    cmean=cXtr.mean(0); cstd=cXtr.std(0); cstd[cstd==0]=1
    cZtr,cZte,cZall=(cXtr-cmean)/cstd,(cXte-cmean)/cstd,(X-cmean)/cstd
    cgrid = GridSearchCV(LogisticRegression(max_iter=1000), {"C":[0.03,0.1,0.3,1,3,10]}, cv=5, scoring="roc_auc")
    cgrid.fit(cZtr, cytr); best_C = cgrid.best_params_["C"]
    base = LogisticRegression(C=best_C, max_iter=1000).fit(cZtr, cytr)
    f_te = base.decision_function(cZte); proba_raw = sig(f_te)
    # out-of-fold Platt calibration fit on TRAIN decision scores
    f_oof = cross_val_predict(LogisticRegression(C=best_C, max_iter=1000), cZtr, cytr, cv=5, method="decision_function")
    platt = LogisticRegression().fit(f_oof.reshape(-1,1), cytr)
    A=float(platt.coef_[0][0]); B=float(platt.intercept_[0])
    proba_cal = sig(A*f_te + B)
    auc = roc_auc_score(cyte, proba_cal); cpred=(proba_cal>=0.5).astype(int)
    cvauc = cross_val_score(LogisticRegression(C=best_C, max_iter=1000), cZall, yb, cv=5, scoring="roc_auc")
    brier_before=brier_score_loss(cyte, proba_raw); brier_after=brier_score_loss(cyte, proba_cal)
    cm=confusion_matrix(cyte, cpred)
    cmetrics={"auc":round(auc,4),"accuracy":round(accuracy_score(cyte,cpred),4),"precision":round(precision_score(cyte,cpred),4),
              "recall":round(recall_score(cyte,cpred),4),"f1":round(f1_score(cyte,cpred),4),
              "cv_auc_mean":round(cvauc.mean(),4),"cv_auc_std":round(cvauc.std(),4),
              "brier_before_cal":round(brier_before,4),"brier_after_cal":round(brier_after,4)}
    print(f"[{key}] CLASSIFY    best_C={best_C}  AUC={auc:.3f} CV-AUC={cvauc.mean():.3f}±{cvauc.std():.3f}  Brier {brier_before:.3f}->{brier_after:.3f}")

    cfinal = LogisticRegression(C=best_C, max_iter=1000).fit(cZall, yb)
    clf_json={"task":task+"_class","model":f"logistic_regression(C={best_C}) + Platt calibration","dataset":meta["dataset"],
        "positive_class":"faster-than-typical "+meta["target_name"]+" (target above the cohort median)","threshold_target":thr,
        "features":[{"key":f[3],"label":f[1],"unit":f[2]} for f in feats],
        "standardize":{"mean":cmean.round(6).tolist(),"std":cstd.round(6).tolist()},
        "coef":cfinal.coef_[0].round(6).tolist(),"intercept":float(round(cfinal.intercept_[0],6)),
        "calibration":{"A":round(A,6),"B":round(B,6),"method":"platt_sigmoid"},
        "impute_with":cmean.round(6).tolist(),"selection":{"best_C":best_C},"metrics":cmetrics,
        "n_train":int(len(cytr)),"n_test":int(len(cyte)),"trained_at":datetime.now(timezone.utc).isoformat()}
    json.dump(clf_json, open(os.path.join(MODEL_OUT,f"{task}_class.json"),"w"), indent=2)

    fpr,tpr,_=roc_curve(cyte, proba_cal)
    plt.figure(figsize=(4.4,4.4)); plt.plot(fpr,tpr,color="#8e44ad",lw=2,label=f"AUC={auc:.2f}"); plt.plot([0,1],[0,1],"k--",lw=1)
    plt.xlabel("False positive rate"); plt.ylabel("True positive rate"); plt.title(f"{key}: classification ROC")
    plt.legend(loc="lower right"); plt.tight_layout(); plt.savefig(os.path.join(CHART_OUT,f"{task}_class_roc.png"),dpi=120); plt.close()
    plt.figure(figsize=(3.8,3.6)); plt.imshow(cm,cmap="Purples")
    for i in range(2):
        for j in range(2): plt.text(j,i,cm[i,j],ha="center",va="center",fontsize=14,color="white" if cm[i,j]>cm.max()/2 else "black")
    plt.xticks([0,1],["Pred slower","Pred faster"]); plt.yticks([0,1],["Actual slower","Actual faster"])
    plt.title(f"{key}: confusion matrix"); plt.tight_layout(); plt.savefig(os.path.join(CHART_OUT,f"{task}_class_confusion.png"),dpi=120); plt.close()
    # reliability curve (calibrated vs raw)
    frac_raw,mean_raw=calibration_curve(cyte, proba_raw, n_bins=5)
    frac_cal,mean_cal=calibration_curve(cyte, proba_cal, n_bins=5)
    plt.figure(figsize=(4.4,4.4)); plt.plot([0,1],[0,1],"k--",lw=1,label="perfect")
    plt.plot(mean_raw,frac_raw,"o-",color="#bbb",label=f"raw (Brier {brier_before:.2f})")
    plt.plot(mean_cal,frac_cal,"o-",color="#27ae60",label=f"calibrated (Brier {brier_after:.2f})")
    plt.xlabel("Predicted probability"); plt.ylabel("Observed frequency"); plt.title(f"{key}: reliability curve")
    plt.legend(loc="upper left"); plt.tight_layout(); plt.savefig(os.path.join(CHART_OUT,f"{task}_class_calibration.png"),dpi=120); plt.close()
    print(f"        wrote src/ml/{task}.json + {task}_class.json + 5 charts")
    return reg_json, clf_json


if __name__ == "__main__":
    for k in (sys.argv[1:] or list(MODELS)):
        if k in MODELS: train_one(k)
        else: print(f"unknown model '{k}' (have {list(MODELS)})")
