<div align="center">

# Diagassist

### Understand your medical reports

Diagassist turns a raw lab report into a clear, personalized health briefing. A user uploads a PDF or a phone photo of their blood test, and within seconds the app reads every value, explains what each one means in plain language, scores overall health, projects long-term risk, and produces a 30-day action plan.

Developed for **PredLabs Pvt. Ltd.**


> **Provenance.** This project began as a Lovable-built prototype by PredLabs. I adopted the
> repository with its history intact and rebuilt it — the analysis pipeline, the async job model, and
> the privacy-first backend — before handing it back. The commit history therefore includes the
> original build, and the earliest commits are not mine.

![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Deno](https://img.shields.io/badge/Deno-000000?logo=deno&logoColor=white)
![Cerebras](https://img.shields.io/badge/Cerebras-F55036)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?logo=google&logoColor=white)

</div>

<p align="center">
  <img src="docs/screenshots/01-landing.png" alt="Diagassist landing page" width="100%">
</p>

---

## Overview

Lab reports are written for clinicians, not patients. A page of numbers, units, and reference ranges tells most people very little about how they are actually doing. Diagassist closes that gap.

The user gives the app one thing: a lab report. From there it does the reading, the interpretation, and the follow-up. It extracts every parameter, flags the ones outside range, asks a short set of relevant symptom questions to add context, and returns a single, readable picture of the person's health, complete with a score, a ten-year risk outlook, and concrete next steps. No account is required, and nothing is stored after the analysis.

## What it does

- **Reads any report.** Accepts a PDF or a photo. A vision model performs OCR on every page and pulls out each test, value, unit, and reference range.
- **Explains it in plain language.** Each abnormal result is described in everyday terms, grouped into medical panels, with an overall "needs attention" verdict.
- **Scores your health.** A weighted 0-100 health score with a body-systems breakdown (metabolic, cardiovascular, kidney, liver, blood, endocrine), benchmarked to the user's age group.
- **Adds clinical context.** A short adaptive assessment asks symptom questions tailored to the findings, sharpening the interpretation.
- **Projects risk honestly.** Ten-year cardiovascular and diabetes trajectories, presented as a relative index rather than a false precision, with a clear "not a diagnosis" framing.
- **Gives an action plan.** A personalized 30-day roadmap of dietary, lifestyle, and follow-up steps, plus downloadable PDF reports.
- **Respects privacy.** Account-free and ephemeral by design; the user simply downloads their own copy.

## How it works

The experience is four steps, front to back.

| Step | Stage | What happens |
| --- | --- | --- |
| 01 | Upload | Secure PDF or photo upload |
| 02 | AI Analysis | Real-time reading of every parameter |
| 03 | Clinical Chat | Tailored symptom questions for context |
| 04 | Results | A comprehensive, readable health briefing |

<p align="center">
  <img src="docs/screenshots/02-upload.png" alt="Upload screen" width="49%">
  <img src="docs/screenshots/03-analysis.png" alt="Analysis in progress" width="49%">
</p>

<p align="center">
  <img src="docs/screenshots/04-assessment.png" alt="Clinical assessment" width="49%">
  <img src="docs/screenshots/05-health-score.png" alt="Health score" width="49%">
</p>

<p align="center">
  <img src="docs/screenshots/06-report.png" alt="Comprehensive health report" width="49%">
  <img src="docs/screenshots/07-risk.png" alt="Risk trajectory" width="49%">
</p>

<p align="center">
  <img src="docs/screenshots/08-interactive-analysis.png" alt="Interactive risk calculator" width="80%">
</p>

## Tech stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite | Single-page app, type safety, fast builds |
| Styling | Tailwind CSS, shadcn/ui | Design system and accessible components |
| Data and charts | TanStack Query, Recharts | Fetching and caching, risk visualizations |
| Documents | jsPDF | Client-side PDF report generation |
| Backend | Supabase: PostgreSQL, Edge Functions (Deno), Storage | Database, serverless API, file storage |
| AI, primary | Cerebras Inference (gemma-4-31b) | Vision OCR, medical analysis, and clinical chat |
| AI, fallback | Google Gemini (gemini-3.6-flash, env-overridable) | Automatic failover for reliability |
| Retrieval (RAG) | pgvector on PostgreSQL, Google gemini-embedding-001 | India-first grounding of every abnormal-finding explanation |
| Machine learning | Python, scikit-learn | Trained risk models (regression + classification), served in-browser |
| Quality | Custom eval harness, GitHub Actions CI | Hallucination/cost metrics; model-contract + typecheck gating |
| Tooling | Supabase CLI, Git and GitHub | Schema migrations, function deploys, version control |

## Architecture

Diagassist is a static frontend backed by a serverless backend on Supabase. The browser never calls an AI provider directly; every model call runs inside a Supabase Edge Function, which keeps API keys off the client and lets the pipeline retry and fail over on the server side.

```mermaid
flowchart TD
    subgraph Client["Client - React + Vite (static, no login)"]
      A["Upload PDF or photo"]
      R["Render health score, risk,<br/>and 30-day plan"]
    end

    subgraph Backend["Supabase - serverless backend"]
      EF["Edge Functions (Deno)<br/>analyze-medical-report<br/>process-pdf-report<br/>clinical-triage-chat"]
      DB[("PostgreSQL<br/>pdf_analyses")]
      KB[("pgvector<br/>kb_chunks + retrieval_cache<br/>India-first corpus")]
      ST[("Storage<br/>medical-reports")]
    end

    subgraph AI["AI providers"]
      C["Cerebras - gemma-4-31b<br/>(primary)"]
      G["Google Gemini - gemini-3.6-flash<br/>(fallback)"]
    end

    A -->|report| EF
    EF -->|detected analytes| KB
    KB -.cited India-first references.-> EF
    EF -->|vision OCR + grounded analysis| C
    C -. retry / fail over .-> G
    EF -->|structured result| DB
    DB -->|labs + demographics| ML["ML risk models<br/>(in-browser inference)"]
    ML --> R
    R -->|poll for completion| DB
    EF -. camera images .-> ST
```

**Request flow.** The browser turns the report into page images and calls an Edge Function. The function runs a two-pass pipeline - a vision OCR pass that reads every value, then a clinical-grade analysis pass that structures and interprets them - and writes the result to a `pdf_analyses` row. Because analysis can outlast a single request, this is an asynchronous job: the function returns an id immediately, does the work in the background, and the frontend polls the row until it is complete, then renders everything on the client.

**Edge Functions (Deno).**

- `analyze-medical-report` - the PDF path: vision OCR plus the main clinical analysis.
- `process-pdf-report` - the camera path: structured extraction from photos via tool-calling.
- `clinical-triage-chat` - the adaptive symptom assessment that adds clinical context.
- `get-analysis-result` - result retrieval for polling.

**Reliability.** Every model call is wrapped in retry with exponential backoff, and if Cerebras is rate-limited or unavailable it fails over automatically to Google Gemini, so a single provider outage does not take the pipeline down.

**Privacy by design.** There is no authentication and no long-term storage of personal health data. Analyses are ephemeral job records, access is scoped to the anonymous role, and users simply download their own copy.

## Grounded answers (RAG)

A large language model that explains lab results can sound confident and still be
wrong. To make the explanations trustworthy, every abnormal-finding explanation is
**grounded in retrieved, cited medical references** rather than the model's memory.

- **India-first corpus.** A curated, paraphrased knowledge base prioritizes credible
  Indian sources (ICMR / NIN) over global ones (WHO, ADA, AHA, KDIGO) and plain-language
  references (MedlinePlus), because reference ranges, diet advice, and disease prevalence
  differ by population. Licensing is respected - the corpus is public-domain or original
  paraphrase, never verbatim guideline text.
- **Retrieval on pgvector.** Chunks are embedded (`gemini-embedding-001`, 768-dim) and stored
  in PostgreSQL with `pgvector`. To keep the live path cheap, retrieval is **precomputed** into
  a cache keyed by `(analyte, direction)`, so the online request is a table lookup, not a live
  vector search - a deliberate cost optimization.
- **Cited, verifiable, hallucination-guarded.** The analysis prompt may cite only the supplied
  `[S#]` references; fabricated citation ids are stripped post-hoc, and the UI shows the cited
  sources as chips (India-tier tagged) that link out.

The retrieval + ingestion tooling lives in `scripts/` and `corpus/`.

## Risk models (ML)

Alongside the LLM, a **classical machine-learning layer** adds a quantitative, explainable
risk estimate - the right tool for a numeric prediction. Models are trained offline on
**public datasets** (no patient data is ever used for training), exported to JSON, and run
**entirely in the browser** as a dot product - no extra backend.

| Model | Type | Dataset | Held-out performance |
| --- | --- | --- | --- |
| Diabetes progression | Regression | scikit-learn diabetes (442) | R² 0.38 [95% CI 0.21–0.51], RMSE 59 vs 75 baseline |
| Diabetes - faster than typical | Classification | scikit-learn diabetes (442) | ROC-AUC 0.78 [95% CI 0.69–0.86], Brier 0.19 |
| Breast cancer (malignant) | Classification | Wisconsin (569) | ROC-AUC 0.996 [95% CI 0.99–1.00], Brier 0.02 |

Every model is **hyperparameter-tuned by cross-validation** (`GridSearchCV`), **probability-
calibrated** (Platt scaling, checked with the Brier score and a reliability curve), and
**explainable** (per-feature contributions in the app; permutation-importance charts offline). Every headline metric carries a **bootstrap 95% confidence interval**, and each classifier ships a **threshold / operating-point** analysis.
The trainer is a one-file registry - adding a disease is one loader entry. See
[`ml/README.md`](ml/README.md), the described chart index at
[`ml/report/charts/INDEX.md`](ml/report/charts/INDEX.md), and the self-contained study page
[`ml/report/ml_model_cards.html`](ml/report/ml_model_cards.html). Try the models live at the
in-app **`/models`** explorer.

## Quality: evaluation and CI

- **RAG evaluation harness** (`scripts/eval.ts`) runs a golden set through the pipeline twice -
  grounded vs ungrounded - and reports retrieval recall, citation coverage, fabricated-citation
  rate, an LLM-judged faithfulness score, and **tokens + API cost per report** before vs after
  grounding, reusing the exact production retrieval and model path.
- **Continuous integration** (GitHub Actions) gates every push: a dependency-free
  model-contract test (`ml/verify_inference.mjs`) fails the build if the exported models regress
  or predictions stop behaving sanely, plus a TypeScript typecheck.

## Getting started

```bash
# Frontend
git clone https://github.com/zayedongit/diagassist-ai.git
cd diagassist-ai
npm install
cp .env.example .env        # add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

```bash
# Backend (Supabase project)
supabase link --project-ref <your-project-ref>
supabase db push
supabase secrets set CEREBRAS_API_KEY=<key> GEMINI_API_KEY=<key>
supabase functions deploy analyze-medical-report --no-verify-jwt
supabase functions deploy process-pdf-report --no-verify-jwt
supabase functions deploy clinical-triage-chat --no-verify-jwt
supabase functions deploy get-analysis-result --no-verify-jwt
```

## Disclaimer

Diagassist is an informational tool, not a medical device. Its output is not a diagnosis and does not replace professional medical advice. Users should always consult a qualified healthcare provider about their results.

---

<div align="center">

Developed for **PredLabs Pvt. Ltd.**

</div>
