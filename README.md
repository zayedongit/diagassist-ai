<div align="center">

# Diagassist

### Understand your medical reports

Diagassist turns a raw lab report into a clear, personalized health briefing. A user uploads a PDF or a phone photo of their blood test, and within seconds the app reads every value, explains what each one means in plain language, scores overall health, projects long-term risk, and produces a 30-day action plan.

Developed for **PredLabs Pvt. Ltd.**

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

## Tech stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite | Single-page app, type safety, fast builds |
| Styling | Tailwind CSS, shadcn/ui | Design system and accessible components |
| Data and charts | TanStack Query, Recharts | Fetching and caching, risk visualizations |
| Documents | jsPDF | Client-side PDF report generation |
| Backend | Supabase: PostgreSQL, Edge Functions (Deno), Storage | Database, serverless API, file storage |
| AI, primary | Cerebras Inference (gemma-4-31b) | Vision OCR, medical analysis, and clinical chat |
| AI, fallback | Google Gemini (gemini-2.0-flash) | Automatic failover for reliability |
| Tooling | Supabase CLI, Git and GitHub | Schema migrations, function deploys, version control |

## Architecture

The app is a static frontend backed by a managed serverless backend.

1. The browser sends the report to a Supabase Edge Function.
2. The function reads each page with a vision model (OCR), runs a clinical-grade analysis pass, and writes the structured result to PostgreSQL.
3. The frontend polls for completion, then renders the score, risk trajectories, and plan entirely on the client.
4. Every model call is wrapped with retry and backoff, and falls back from Cerebras to Google Gemini if the primary provider is unavailable, so the pipeline stays up.
5. There is no login and no long-term storage. Analyses are ephemeral, and users download their own copy.

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
