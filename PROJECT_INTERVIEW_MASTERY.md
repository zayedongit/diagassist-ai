# Diagassist — Project Interview Mastery

> A ground-up, code-accurate guide to defending this project in a technical interview.
> Everything here is derived from the actual repository (`zayedongit/diagassist-ai`).
> Where the code is ambiguous or a claim can't be verified from code, it is explicitly flagged as **[VERIFY]**.

**How to read this doc:** each concept is explained twice — first in **plain human language**, then in the **technical version**. Sections are also split into "what the code currently does", "why it was probably designed this way", and "what would be better in production".

---

## A CRITICAL HONESTY NOTE (read this first)

You built this with heavy AI assistance. An interviewer will smell memorised buzzwords instantly. The single most convincing thing you can do is **own the project honestly**, including its rough edges. This document deliberately points out the weak parts so that when an interviewer finds them (and a good one will), you can say *"yes, I know about that, here's why, and here's how I'd fix it"* — which is far more impressive than pretending the project is perfect.

Three honest truths about this repo you should internalise:

1. **The "medical analysis" is an LLM wrapper, not a validated medical engine.** The accuracy comes from a large language model (Cerebras `gemma-4-31b`) reading the report. The health score and risk numbers are **heuristics computed in the browser** from the LLM's output — not clinically validated models.
2. **A large amount of the repo is dead or unused** — roughly 40 Supabase edge functions exist but only about 5–6 are actually deployed and exercised; several npm dependencies are never imported; the frontend still calls functions that don't exist on the current backend.
3. **This started from a Lovable (AI app builder) scaffold** and was then heavily reworked (backend migrated to an independent Supabase project, LLM switched to Cerebras + Gemini, login removed, UI redesigned, accuracy bugs fixed). That reworking story is genuinely interesting and worth telling.

---

# PHASE 2 — THE PROJECT IN ONE SENTENCE

## 1. What is this project?
**Diagassist is a web app that reads a person's medical lab report (uploaded as a PDF or a phone photo) and turns it into a plain-language health briefing** — flagged abnormal values, a health score, a symptom-based follow-up assessment, a long-term risk view, a 30-day plan, and a downloadable PDF summary.

## 2. What real-world problem does it solve?
Lab reports are written for clinicians. A normal person sees a wall of numbers, units, and reference ranges and has no idea what matters. Diagassist bridges that gap: **it explains your own report to you in language you understand.**

## 3. Who is the intended user?
A patient/consumer of a diagnostic lab. The repo was **developed for PredLabs (a diagnostic lab)** — the lab's customers are the intended end users.

## 4. What does the user actually do with it?
Open the site → upload a PDF or take photos of their report → wait ~15–40s while it's analysed → answer a few multiple-choice symptom questions → read the results (score, flagged values, risks, plan) → optionally download a PDF. **No account, no login.**

## 5. What happens technically after the user uploads?
The browser extracts text (or renders images) from the PDF using `pdfjs-dist`, then calls a **Supabase Edge Function** (`analyze-medical-report`). That function uses an LLM (Cerebras `gemma-4-31b`, with Google Gemini as a fallback) to read every value and produce a structured JSON analysis, which it writes to a Postgres row. The browser **polls** that row until it's done, then renders everything, computing the score/risk **client-side** from the JSON.

## 6. What makes it technically interesting?
- An **asynchronous "job" pipeline** on serverless functions (`EdgeRuntime.waitUntil`) so long analyses survive past the HTTP response.
- A **two-provider LLM strategy** with retry/backoff and automatic Cerebras→Gemini failover.
- A deliberate **account-free, ephemeral, privacy-first** design (no auth, no long-term storage).
- **Vision OCR + structured extraction** from arbitrary lab-report layouts.

### Say it to a non-technical recruiter
> "It's like Google Translate for your blood test. You upload your lab report and it explains, in normal English, what's fine, what needs attention, and what to do about it."

### Say it to a software engineer
> "It's a React/Vite single-page app with a Supabase serverless backend. The browser sends a report to an edge function that runs an LLM-based OCR-and-analysis pipeline, stores structured results in Postgres, and the client polls for them and renders a score, risk view, and downloadable report. It's account-free and the analysis is ephemeral."

### Say it to a senior engineer
> "Static SPA plus Supabase edge functions (Deno). The upload triggers an async job: the function inserts a `pdf_analyses` row, returns an id, and does the OCR+analysis in a background task via `EdgeRuntime.waitUntil`, updating the row on completion; the client long-polls the row. LLM calls go through a retry/backoff wrapper with Cerebras primary and Gemini failover. The scoring and risk projections are heuristic and computed client-side — that's a deliberate simplification, and the risk 'projection' is presented as a relative index, not a validated probability."

---

# PHASE 3 — INTERVIEW EXPLANATIONS (say these out loud)

## A. 30-second version
> "Diagassist takes a medical lab report — a PDF or a photo — and explains it in plain language. Under the hood it's a React app with a Supabase serverless backend; when you upload, an edge function uses an LLM to read every value and produce a structured analysis, which the frontend renders as a health score, flagged results, and a downloadable report. It's account-free and privacy-first — nothing's stored against a person."

**Emphasise:** the problem (reports are unreadable), the LLM-OCR pipeline, serverless.
**Avoid:** claiming it's a validated medical device or diagnostic tool.

## B. 1-minute version
> "The problem I was solving is that lab reports are written for doctors — patients can't read them. Diagassist fixes that. It's a single-page React app built with Vite and TypeScript, styled with Tailwind and shadcn/ui. The backend is entirely Supabase — Postgres, plus serverless edge functions written in Deno. When a user uploads a report, the browser pulls the text or images out of the PDF and calls an edge function. That function runs a two-pass LLM pipeline — first vision OCR to read the pages, then a clinical-analysis pass — on Cerebras' fast inference API, with Google Gemini as an automatic fallback. Because analysis can take longer than a single request, it's an async job: the function writes a row, returns immediately, finishes in the background, and the frontend polls until it's done. Then the client computes a health score and risk view and lets the user download a PDF. There's deliberately no login — analyses are ephemeral."

**Emphasise:** async job pattern, dual-LLM failover, account-free design.
**Avoid:** overstating the scoring's medical rigor.

## C. 3-minute version
Cover, in order: (1) the problem, (2) the stack (React/Vite/TS/Tailwind/shadcn on the front; Supabase Postgres + Deno edge functions on the back), (3) the upload→analyse→poll→render flow with the async `waitUntil` detail, (4) the LLM strategy (Cerebras primary, Gemini fallback, retry/backoff, why a fast provider), (5) the account-free ephemeral design and why it fits a privacy-sensitive medical tool, (6) one honest limitation ("the score and risk are heuristics I compute on the client — a production version would use a validated risk model"), (7) one thing you're proud of ("making the pipeline resilient — retries plus provider failover — so a rate-limit or outage doesn't break a user's analysis").

## D. 5-minute deep technical version
Walk the **actual execution path** (see Phase 7), name real files (`src/pages/Index.tsx`, `src/utils/pdfToImages.ts`, `supabase/functions/analyze-medical-report/index.ts`, `src/utils/healthScoreCalculator.ts`), the DB table (`pdf_analyses`), the polling mechanism, and then discuss trade-offs (heuristic scoring, no rate limiting, RLS open to anon, dead code). Finish with "if I rebuilt it" points (Phase 25). **The goal is to sound like you can navigate the repo live**, not recite this doc.

---

# PHASE 4 — COMPLETE ARCHITECTURE

## Actual architecture (ASCII)

```
                          Browser (React SPA, static)
                          - src/pages/Index.tsx (orchestrator)
                          - pdfjs-dist: extract text / render images
                                   │
             (1) upload PDF/photo  │  supabase.functions.invoke(...)
                                   ▼
        ┌───────────────────────────────────────────────────────────┐
        │              SUPABASE (managed serverless backend)          │
        │                                                             │
        │  Edge Functions (Deno)                                      │
        │   • analyze-medical-report   (PDF path: OCR + analysis)     │
        │   • process-pdf-report       (camera path: tool-calling)    │
        │   • process-single-report                                   │
        │   • clinical-triage-chat     (symptom Q&A)                  │
        │   • get-analysis-result      (polling read)                 │
        │        │                     ▲                              │
        │        │ (2) call LLM        │ (4) poll for result          │
        │        ▼                     │                              │
        │  ┌───────────────┐   (3) write row / read row               │
        │  │  AI providers │   ┌──────────────────────────┐          │
        │  │  Cerebras     │   │ PostgreSQL: pdf_analyses  │          │
        │  │  gemma-4-31b  │   │ Storage: medical-reports  │          │
        │  │   (primary)   │   └──────────────────────────┘          │
        │  │      │fallback │                                         │
        │  │      ▼         │                                         │
        │  │  Google Gemini │                                         │
        │  │  2.0-flash     │                                         │
        │  └───────────────┘                                         │
        └───────────────────────────────────────────────────────────┘
                                   │
             (5) result JSON       │
                                   ▼
                  Browser renders (all client-side):
                  - HealthScoreCard  (healthScoreCalculator.ts)
                  - RiskPredictionTimeline (riskProjection.ts)
                  - MedicalChatAgent (clinical-triage-chat)
                  - generate*Pdf (jsPDF) → download
```

## Component-by-component

| Component | What it is | Why it exists | Tech | Why that tech | Without it | How it talks to others |
|---|---|---|---|---|---|---|
| **Frontend SPA** | The whole UI, runs in the browser | Users need a page to upload and read results | React 18 + Vite + TS | Fast dev/build (Vite+SWC), typed | No UI | Calls Supabase via `@supabase/supabase-js` |
| **Edge Functions** | Serverless functions (Deno) | Run secret LLM calls off the client; do the heavy pipeline | Supabase Edge Functions | Bundled with the DB/storage; no server to manage | Keys leak to client; no server-side pipeline | Invoked over HTTPS; read/write Postgres + Storage; call LLM APIs |
| **PostgreSQL** | The database | Async job store + result cache the client polls | Supabase Postgres | Managed, comes with Supabase | No way to hand results back to a slow client | Functions write; client reads |
| **Storage** | File bucket `medical-reports` | Holds camera-captured images (server-side writes) | Supabase Storage | Integrated | Camera path can't stage images | Written by `process-pdf-report` |
| **Cerebras** | Primary LLM (`gemma-4-31b`) | OCR + clinical analysis + chat | Cerebras Inference API | Very fast, multimodal, OpenAI-compatible | No analysis at all | Called by edge functions (chat completions) |
| **Google Gemini** | Fallback LLM (`gemini-2.0-flash`) | Keeps pipeline alive if Cerebras fails | Gemini OpenAI-compat endpoint | Free tier, multimodal, tool-calling | Cerebras outage = broken analysis | Called on Cerebras failure |
| **Client-side calculators** | `healthScoreCalculator`, `healthRiskCalculator`, `riskProjection` | Turn the analysis JSON into score/risk UI | Plain TypeScript | Cheap, no backend round-trip | No score/risk view | Consume the analysis result object |

**Networking note:** the browser never talks to Cerebras/Gemini directly. All model calls happen inside edge functions, which keeps API keys server-side and lets the pipeline retry/fail over centrally.

---

# PHASE 5 — TECHNOLOGY STACK

> `playwright` appears in a throwaway clone's devDeps used to take screenshots — it is **not** part of the real project. Excluded below.

| Technology | Where used | Why used | What it does *in this project* | Alternatives | Interview importance |
|---|---|---|---|---|---|
| **React 18.3** | All UI (`src/`) | Component model for a rich, stateful UI | Renders the whole app; heavy local state in `Index.tsx` drives the flow | Vue, Svelte, Angular | HIGH |
| **Vite 5.4 + `@vitejs/plugin-react-swc`** | Build/dev | Fast dev server + build | Serves `src/main.tsx`, bundles for prod (`dist/`) | CRA, Webpack, Next.js | HIGH |
| **TypeScript 5.8** | Everywhere | Type safety | Types the analysis result (`src/types/medicalAnalysis.ts`), props, etc. | Plain JS | MEDIUM |
| **Tailwind CSS 3.4** | Styling | Utility-first styling | All layout/colours; design tokens in `src/index.css` | CSS modules, styled-components | MEDIUM |
| **shadcn/ui (Radix primitives)** | `src/components/ui/*` | Prebuilt accessible components | Dialogs, tabs, radio groups, toasts | MUI, Chakra | MEDIUM |
| **React Router 6.30** | `src/App.tsx` | Client-side routing | Routes `/`, `/admin`, `/analytics`, etc. | TanStack Router | MEDIUM |
| **TanStack Query 5.83** | `App.tsx` provider | Data fetching/caching | **Provider is mounted but the core analysis flow uses direct supabase calls + local state, not react-query** — largely underused | SWR | MEDIUM (be honest it's underused) |
| **@supabase/supabase-js 2.79** | `src/integrations/supabase/client.ts` | Backend SDK | `supabase.functions.invoke(...)` and `.from('pdf_analyses')` reads | Raw fetch | HIGH |
| **Supabase (Postgres + Edge Functions + Storage)** | `supabase/` | Entire backend | DB, serverless functions (Deno), file bucket | Firebase, custom Node+Postgres | HIGH |
| **Deno** | Edge function runtime | Runs the functions | Executes `supabase/functions/*/index.ts` | Node (Lambda) | HIGH |
| **Cerebras Inference (`gemma-4-31b`)** | Edge functions | Fast multimodal LLM | OCR + analysis + chat | OpenAI, Anthropic, Groq | HIGH |
| **Google Gemini (`gemini-2.0-flash`)** | Edge functions | LLM fallback | Failover on Cerebras errors | Any 2nd provider | HIGH |
| **pdfjs-dist 5.4** | `src/utils/extractPdfText.ts`, `pdfToImages.ts` | Read PDFs in the browser | Extract text / render pages to images | Server-side parse | HIGH |
| **jsPDF 3** | `src/utils/generate*Pdf.ts` | Make downloadable PDFs | Client-side report PDF generation | Server render, react-pdf | MEDIUM |
| **Recharts 2.15** | Risk charts | Charts | Risk trajectory line charts | Chart.js, visx | LOW/MEDIUM |
| **zod 3.25 + react-hook-form** | Forms/validation | Schema validation | Present; input validation in a couple of edge functions/forms | yup | LOW |
| **sonner** | Toasts | Notifications | Success/error toasts | react-hot-toast | LOW |
| **lucide-react** | Icons | Iconography | Icons throughout | react-icons | LOW |
| **Supabase CLI** | Ops | Deploy/migrate | `db push`, `functions deploy`, `secrets set` | — | HIGH |

**Unused / dead dependencies (be honest if asked):** `pdf-parse`, `pdf2pic` (Node-side PDF libs — never imported in `src/`), `@xyflow/react` (flow-diagram lib — no import found), and the `@11labs/react` voice widget + the ElevenLabs `convai` script in `index.html` are tied to a **removed** voice feature. These are leftovers from the scaffold/iteration and inflate the bundle/`package.json`.

---

# PHASE 6 — FILE-BY-FILE BREAKDOWN (the parts that matter)

### Entry + shell
- **`index.html`** — HTML shell; loads Poppins/Inter from Google Fonts, references `/favicon.png`, mounts `#root`, and **still loads an ElevenLabs `convai` widget `<script>`** (leftover). Title: "Diagassist - AI-Powered Lab Analysis".
- **`src/main.tsx`** — React entry; mounts `<App/>`.
- **`src/App.tsx`** — Providers (`QueryClientProvider`, `AuthProvider`, `TooltipProvider`, toasters) + `BrowserRouter` routes. Routes: `/` (Index), `/admin`, `/analytics`, `/my-health-journey`, `/shared-report/:token`, `/my-reports` (wrapped in `ProtectedRoute`), `/terms`, `*` (NotFound). **Only `/` is a fully functional path now; the secondary routes depend on backend features that aren't deployed on the current project.**

### The core page
- **`src/pages/Index.tsx`** — **The god component (~2,500 lines).** This one file orchestrates almost everything: upload handling, PDF text/image extraction, calling the analyze function, polling, holding the analysis result in state, rendering every result section, the download handlers, error/retry UI, and localStorage persistence.
  - `processClientSide(file)` (~line 1111): `extractPdfText(file)` → if enough text, send `requestBody.text`; else `convertPdfToImages(file)` → send `requestBody.images`. Then `supabase.functions.invoke('analyze-medical-report', { body: requestBody })`.
  - Polling loop reads `pdf_analyses` (via `get-analysis-result` and/or `.from('pdf_analyses')`) until `status` is `completed`/`failed`.
  - `handleDownloadEssentialReport` / `handleDownloadComprehensiveReport` / `handleDownload30DayPlan` → `generate*Pdf` (jsPDF, client-side).
  - **Interview flag:** this is a classic "god component" — an obvious refactor target.

### Auth (deliberately neutered)
- **`src/hooks/useAuth.tsx`** — **No real auth.** Returns a synthetic anonymous user (`{ id: <stable per-browser id from localStorage> }`), `isAuthenticated: true` always, `signOut` a no-op. **No Supabase-auth calls at all.** This is how "login removed" is implemented centrally — every gate that checks `isAuthenticated`/`user` passes.
- **`src/components/ProtectedRoute.tsx`, `AuthDialog.tsx`, `AuthPrompt.tsx`, `PhoneAuth.tsx`** — login UI that is now effectively dormant (gates never trigger because the anon user is always "authenticated").

### Supabase client
- **`src/integrations/supabase/client.ts`** — Creates the client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. Configured with `auth: { storage: localStorage, persistSession, autoRefreshToken }` — **vestigial**, since no auth is used.
- **`src/integrations/supabase/types.ts`** — Generated DB types.

### Utilities (the real logic)
- **`src/utils/extractPdfText.ts`** — pdfjs text extraction; sets `GlobalWorkerOptions.workerSrc` to a **jsdelivr CDN URL** (runtime external dependency — a real SPOF).
- **`src/utils/pdfToImages.ts`** — Renders PDF pages to canvas → data-URL images (same CDN worker note).
- **`src/utils/retryWithBackoff.ts`** — Frontend retry helper: default `maxRetries: 3`, `initialDelay: 1000`, `backoffMultiplier: 2`, `retryableStatuses: [408,429,500,502,503,504]`. (The edge functions have their **own** separate retry helpers.)
- **`src/utils/healthScoreCalculator.ts`** — **Client-side heuristic health score.** Weighted per-system scores (metabolic 25%, cardiovascular 25%, kidney 15%, liver 15%, blood 10%, endocrine 10%), unit normalization (mmol/L, µmol/L, g/L, raw platelet counts), sex-specific hemoglobin/creatinine cutoffs, an abnormality penalty, and a re-normalization over *measured* systems. Thresholds are hardcoded.
- **`src/utils/healthRiskCalculator.ts`** — Heuristic cardiovascular/diabetes "risk score" as a **points tally (0–100), not a probability.**
- **`src/utils/riskProjection.ts`** — Projects that points tally over 1/5/10 years with hardcoded growth/reduction rates. **Presented in the UI as a "relative risk index", not a validated probability** (this was deliberately reframed to be honest).
- **`src/utils/generate30DayPlanPdf.ts`, `generateComprehensiveReportPdf.ts`, `generateConciseSummaryPdf.ts`, `generateEssentialReportPdf.ts`, `generateFullComprehensiveReport.ts`** — **Five overlapping jsPDF generators.** Real duplication/tech debt.
- **`src/utils/parseClinicalContext.ts`, `deduplicateRecommendations.ts`, `parameterContextDatabase.ts`, `populationData.ts`, `calculateLabPosition.ts`, `labMarker.ts`** — supporting helpers for context, dedupe, reference data, and lab-range bar positioning.
- **`src/types/medicalAnalysis.ts`** — the analysis contract (`EnhancedAnalysisResult` with `overallStatus`, `summary`, `demographics`, `medicalPanels[]` of `abnormalLabs`/`normalParameters`, plus risks/insights/recommendations). This is the shape both the LLM must produce and the UI consumes.

### Key components
- **`UploadZone.tsx`** — upload UI (PDF/photo), file input, camera trigger. Has a `BYPASS_AUTH` flag (now effectively true given anon auth).
- **`MedicalChatAgent.tsx`** — the clinical assessment chat. Calls `clinical-triage-chat` via `invokeWithRetry`. Two modes: `clinical-triage` (structured MCQs, the active mode) and `voiceflow` (simple Q&A). Completing it fires `onClinicalAssessmentComplete`, which unlocks the risk sections.
- **`HealthScoreCard.tsx`, `SystemScoreBreakdown.tsx`** — render the score.
- **`RiskPredictionTimeline.tsx`, `HealthRiskDashboard.tsx`, `InteractiveRiskCalculator.tsx`** — risk visualisations (Recharts), all fed by the client-side calculators.
- **`ComprehensiveReport.tsx`, `ReportPreviewModal.tsx`, `MobileResultsView.tsx`** — result rendering + PDF preview/download.
- **`VoiceFollowUpAgent.tsx`, `MedicalAiAssistant.tsx`** — voice feature (removed from the main flow; component/deps linger).

### Supabase functions (the deployed, relevant ones)
- **`analyze-medical-report/index.ts`** — the PDF path. Parses `requestBody.images` or `.text`; if images, does **vision OCR** (batched + concurrent Cerebras calls); inserts a `pdf_analyses` row (text id like `analysis_...`, `status: processing`); returns the id; then runs the **analysis pass** and `applyMedicalSignificanceFilter` in a **background task** via `EdgeRuntime.waitUntil`, updating the row to `completed`/`failed`. All model calls go through `llmChatCompletion` (Cerebras → Gemini fallback + retry/backoff). Contains `checkIfValueWithinRange(value, range, gender)` for sex-aware range parsing.
- **`process-pdf-report/index.ts`** — the camera path. Uses **tool/function-calling** for structured output; two passes; same Cerebras→Gemini fallback.
- **`clinical-triage-chat/index.ts`** — the MCQ assessment engine; returns structured JSON (questions/report). Cerebras primary with a Gemini fallback + robust JSON extraction.
- **`get-analysis-result/index.ts`** — reads a `pdf_analyses` row by id for polling.
- **`voiceflow-chat/index.ts`** — a simpler report Q&A chat (rewritten to Cerebras).
- **`_shared/`** — shared helpers (e.g., CORS).
- **The other ~35 functions** (admin, payments, OTP/SMS, Google Drive, demo links, etc.) are **present in the repo but not part of the current deployed/used product.** Several are still *invoked* by the frontend (see Phase 24).

### Migrations
- **`supabase/migrations/20250101000000_diagassist_baseline.sql`** — the single clean baseline (see Phase 9). Plus two tiny follow-ups (`_fix_pdf_analyses_id`, `_add_admin_notified_at`).
- **`supabase/_archive_migrations/`** — the **57 original migrations**, archived (not deleted) so git history is preserved but they don't replay on a fresh project.

---

# PHASE 7 — COMPLETE USER FLOW (the primary journey, traced through real files)

**Journey: "User uploads a PDF and gets results."**

```
User drops/uploads a PDF   [UploadZone.tsx]
        ↓  onFileSelect
Index.tsx handleFileSelect → processClientSide(file)   [src/pages/Index.tsx ~1111]
        ↓
extractPdfText(file)   [src/utils/extractPdfText.ts]   → text (pdfjs)
   (if text too short) convertPdfToImages(file)  [src/utils/pdfToImages.ts] → images
        ↓  build requestBody { filename, userId, text | images }
supabase.functions.invoke('analyze-medical-report', { body })   [supabase-js]
        ↓  HTTPS POST /functions/v1/analyze-medical-report
Edge function [supabase/functions/analyze-medical-report/index.ts]
   1. reads CEREBRAS_API_KEY / GEMINI_API_KEY (Deno.env)
   2. if images → vision OCR (batched, concurrent) via llmChatCompletion → text
   3. INSERT pdf_analyses (id='analysis_...', status='processing')   → returns id
   4. EdgeRuntime.waitUntil(background):
        - analysis pass (LLM text → JSON)   [llmChatCompletion → Cerebras→Gemini]
        - applyMedicalSignificanceFilter (checkIfValueWithinRange w/ gender)
        - UPDATE pdf_analyses SET status='completed', result=<jsonb>
        (on throw) UPDATE ... status='failed', error_message=...
        ↓  (function already returned the id to the client)
Index.tsx polls  get-analysis-result / .from('pdf_analyses')  until status done
        ↓  on 'completed'
setAnalysisData(result)   → React re-render
        ↓
Render: HealthScoreCard (calculateHealthScore), ValuesNeedingAttention,
        MedicalChatAgent (clinical-triage-chat), RiskPredictionTimeline,
        Download buttons (generate*Pdf)
```

**Per-step data in/out:**
- **UploadZone → Index:** in = `File`; out = triggers `handleFileSelect`.
- **extract/convert:** in = `File`; out = `text: string` **or** `images: string[]` (data URLs).
- **invoke:** in = `{ filename, userId, text|images }`; out = `{ analysisId, status, ... }` (the row id).
- **background task:** in = text/images; out = a `pdf_analyses` row with `result` JSONB matching `EnhancedAnalysisResult`.
- **poll:** in = `analysisId`; out = the row (`status`, `result`).
- **render + score:** in = `EnhancedAnalysisResult`; out = UI + a numeric health score.

**Secondary journey: "Clinical assessment unlocks risk."** After results render, `MedicalChatAgent` (mode `clinical-triage`) calls `clinical-triage-chat` repeatedly (`invokeWithRetry`), asking MCQs. On completion it calls `onClinicalAssessmentComplete`, which sets state that **unlocks** `RiskPredictionTimeline`/`InteractiveRiskCalculator` (previously gated behind "Complete Clinical Assessment").

---

# PHASE 8 — DATA FLOW

**The central piece of data is the analysis result (`EnhancedAnalysisResult`).**

- **Originates:** produced by the LLM inside `analyze-medical-report`, from the report text/images.
- **Collected:** as JSON from the LLM's chat-completion response.
- **Validated/transformed:** `applyMedicalSignificanceFilter` in the edge function removes labs that are actually within their printed reference range (using `checkIfValueWithinRange`, now sex-aware). JSON is parsed with fallback extraction if the model wraps it.
- **Stored:** in `pdf_analyses.result` (JSONB), with `status`/`error_message`.
- **Retrieved:** the client polls the row (by `id`) via `get-analysis-result` and/or `.from('pdf_analyses')`.
- **Passed:** into React state (`analysisData`) in `Index.tsx`.
- **Displayed:** by many components (`ValuesNeedingAttention`, `ComprehensiveReport`, `HealthScoreCard`, etc.).
- **Derived:** `calculateHealthScore(result, demographics)` and the risk calculators turn it into numbers **client-side**.
- **Updated:** the clinical assessment adds "clinical context" (symptom answers) that feeds the risk view; the analysis row itself isn't re-analysed.
- **Deleted:** ephemeral by design — no per-user history is kept; rows are anonymous job records (a cleanup job function exists but isn't part of the active product).

**A second data path is the anonymous browser id:** created in `useAuth.tsx` (`localStorage`), passed as `userId` on the analyze call so a job can be loosely correlated — **it carries no personal identity.**

---

# PHASE 9 — DATABASE DEEP DIVE

**Technology:** PostgreSQL (managed by Supabase). Access via the supabase-js client (frontend, anon key) and the service-role key (edge functions).

**There is essentially ONE table that matters:** `public.pdf_analyses`.

```sql
create table if not exists public.pdf_analyses (
  id                     text primary key default (gen_random_uuid())::text,
  user_id                text,                 -- anonymous per-browser id, may be null
  filename               text,
  pdf_path               text,
  status                 text not null default 'processing'
                           check (status in ('pending','processing','completed','failed')),
  result                 jsonb,
  error_message          text,
  admin_notified_success boolean not null default false,
  admin_notified_at      timestamptz,
  admin_alerted          boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index pdf_analyses_created_at_idx on public.pdf_analyses (created_at desc);
-- trigger set_updated_at() keeps updated_at fresh on UPDATE
-- RLS enabled; policy: FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)
-- Storage bucket 'medical-reports' (private) created in the same migration
```

**Fields:** `id` (text, because the analyze function generates its own string id like `analysis_<ts>_<rand>` — *this is why it's TEXT, not UUID*), `user_id` (nullable anon id), `filename`, `pdf_path` (camera path), `status` (a CHECK-constrained state machine), `result` (JSONB — the whole analysis), `error_message`, three `admin_*` columns the analyze function writes, timestamps.

**Relationships / keys:** primary key `id`. **No foreign keys** (deliberate — there are no user accounts to reference). One index on `created_at`.

**CRUD:**
- **Create:** `analyze-medical-report` / `process-pdf-report` `INSERT` a `processing` row.
- **Read:** client polls; `get-analysis-result` reads by id.
- **Update:** background task `UPDATE`s to `completed`+`result` or `failed`+`error_message`; trigger bumps `updated_at`.
- **Delete:** not in the active flow (a `cleanup-old-analyses` function exists in the repo but isn't part of the deployed product).

**RLS:** enabled, but the policy is **`using (true) with check (true)` for `anon`** — i.e. wide open. Because there's no login and data is ephemeral/anonymous, this is a *conscious* simplification, but it means anyone with the anon key can read/write any row.

### Likely interview questions (with answers)
- **"Why TEXT primary key, not UUID?"** Because the edge function generates a human-readable string id (`analysis_<timestamp>_<random>`) and inserts it; an early schema used UUID and the insert failed — so the column is TEXT with a text default. Honest and correct.
- **"Why one table and JSONB instead of normalised tables?"** The analysis is a single document consumed as a whole by the UI; the app never queries *inside* the result relationally. JSONB keeps it simple and flexible while the LLM output shape evolves. Trade-off: you can't efficiently query "all reports with high glucose" — but the product never needs that.
- **"What if two requests update the same row simultaneously?"** In practice each analysis owns its own row (unique id), so concurrent writes to the *same* row don't really happen. If they did, it's last-write-wins; there's no optimistic locking.
- **"How would this scale to 10M users?"** The table is a short-lived job queue, not a growing dataset (ephemeral). The bottleneck isn't Postgres — it's LLM throughput/cost and edge-function concurrency. You'd add a real queue, rate limiting, and a TTL/cleanup job; Postgres itself is fine for this access pattern with the `created_at` index.
- **"Which indexes would you add?"** Currently only `created_at`. If you kept history and queried by user you'd index `user_id`; if you queried by `status` for a worker you'd index `status`. For the current ephemeral design, you mostly don't need more.

---

# PHASE 10 — API DEEP DIVE

There is **no custom REST server**. The "API" is Supabase Edge Functions invoked via supabase-js (`POST /functions/v1/<name>`), plus PostgREST reads via `.from('pdf_analyses')`.

### `analyze-medical-report` (the important one)
- **Method/URL:** `POST /functions/v1/analyze-medical-report`
- **Auth:** deployed with `--no-verify-jwt` (public); the anon key is sent as bearer by supabase-js.
- **Request body:** `{ filename, userId, text?: string, images?: string[] }`
- **Validation:** checks for `CEREBRAS_API_KEY`; requires either non-empty `images` or `text`.
- **Backend logic:** OCR (if images) → insert row → background analysis → update row.
- **External calls:** Cerebras (primary), Gemini (fallback) chat completions.
- **Response (immediate):** `{ success, analysisId, status, message, userId }` — returns *before* analysis finishes.
- **Errors:** returns non-2xx / `{ success:false, error }`; specific messages for 401 (bad key), 402 (no credits), 429 (rate limit).

### `get-analysis-result`
- **Method/URL:** `POST /functions/v1/get-analysis-result`
- **Body:** `{ analysisId, userId? }` → reads the `pdf_analyses` row.
- **Response:** the row (`status`, `result`, ...). Used by the poll loop.

### `clinical-triage-chat`
- **Body:** `{ isInitialization?, message?, sessionId, analysisContext, demographics, abnormalPanels, state, selections, ... }`
- **Response:** `{ type: 'question'|'report', question?|report?, state }` — a small state machine driven by the LLM (JSON output, robustly parsed).

### `process-pdf-report`
- Camera path; body includes images; uses tool-calling for structured output; writes `pdf_analyses` + storage.

**Request lifecycle (actual):**
```
Browser (supabase-js) → HTTPS → Supabase API gateway → Edge Function (Deno)
   → (Deno.env secrets) → Cerebras/Gemini + Postgres/Storage → JSON response → Browser
```
There is no Express/controller/service layering — each function is a single `serve()` handler.

---

# PHASE 11 — FRONTEND DEEP DIVE

- **Hierarchy:** `App` (providers + router) → `Index` (the orchestrator) → many result components. Secondary pages (`AdminDashboard`, `Analytics`, `MyReports`, `MyHealthJourney`) exist but depend on backend features that aren't deployed.
- **State:** almost entirely **local React state in `Index.tsx`** (`useState` for `analysisData`, `extractedText`, processing status, error, etc.) plus `localStorage` for resuming an in-flight analysis. **There is no global store (no Redux/Zustand);** `AuthProvider` is the only context, and it's a no-op.
- **Hooks/effects:** effects drive the poll loop and localStorage restore; `useAuth` (anon), `use-mobile`, `use-toast`, `useHealthJourney`/`useNotifications` (auth-dependent, largely dormant).
- **Event handlers:** `handleFileSelect`, download handlers, chat submit.
- **Forms/validation:** minimal on the main flow; `react-hook-form`+`zod` are present but not central.
- **Loading/error states:** `AnimatedLoader`, `StageProgress`, and an inline error state with **retry-in-place** (the failure UI re-renders an `UploadZone` so the user can immediately re-upload).
- **Conditional rendering:** the results page reveals sections progressively (e.g., risk unlocked after the clinical assessment).
- **Auth state:** synthetic; `isAuthenticated` is always true.

**For each major component, answer the five questions** (example — `MedicalChatAgent`): *Problem it solves?* collect symptom context to sharpen the analysis. *Why a component?* self-contained chat + state machine. *Data in?* `analysisContext`, `demographics`, `abnormalPanels`, `mode`. *Renders?* chat bubbles + MCQ options. *Re-renders when?* new question/answer state. *On interaction?* submits an answer → `clinical-triage-chat` → next question or final report → unlocks risk.

---

# PHASE 12 — BACKEND DEEP DIVE

- **"Server startup":** there is no long-running server; each edge function is a Deno `serve()` handler cold-started on demand by Supabase.
- **Routing:** URL = function name. No internal router.
- **Controllers/services:** none — logic is inline in each function's handler. (A cleaner design would extract shared pipeline logic; `_shared/` only holds small helpers.)
- **Middleware:** CORS handling at the top of each function; `--no-verify-jwt` means no JWT gate.
- **Validation:** ad-hoc (`clinical-triage-chat` uses a `zod` schema; others check fields manually).
- **DB access:** functions use the **service-role key** (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`) to write results, bypassing RLS.
- **Error handling:** try/catch around the pipeline; failures set the row to `failed` with a message; the client shows a human "We couldn't read that report" state.
- **External services:** Cerebras + Gemini via `llmChatCompletion` (retry/backoff, provider failover).
- **Logging:** `console.log`/`console.warn`/`console.error` throughout (visible in Supabase function logs). No structured logging/monitoring.

**Trace a request:** see Phase 7's edge-function steps. Key structural point: the function **returns early** and does the slow work in `EdgeRuntime.waitUntil`, which is why the client must poll.

---

# PHASE 13 — AUTHENTICATION & SECURITY

**There is intentionally no authentication.** This is the single most important thing to explain clearly.

- **Login/signup:** removed. `useAuth.tsx` returns a synthetic anonymous user; `isAuthenticated` is always true. No passwords, sessions, JWTs, or cookies are managed by the app.
- **The old phone-OTP flow** (`send-otp`/`verify-otp`, `PhoneAuth`) exists in the repo but is dormant/undeployed.
- **Protected routes:** `ProtectedRoute` still wraps `/my-reports`, but since the anon user is "authenticated", it doesn't actually protect anything.
- **Secrets:** the public anon key + URL are in the frontend `.env` (safe by design — they're public). The **sensitive keys (Cerebras, Gemini, Supabase service-role) live only as Supabase function secrets**, never in the client.

### Security Q&A
- **"What prevents an unauthenticated user from accessing X?"** Nothing — the app is intentionally open. There is no protected data because there are no accounts and analyses are ephemeral/anonymous.
- **"What prevents User A from seeing User B's data?"** There's no per-user data model; rows are anonymous and RLS is `using(true)`. In principle anyone with the anon key could read any `pdf_analyses` row by id. **Mitigations:** ids are unguessable-ish (`analysis_<ts>_<rand>`), data is ephemeral, and it contains no identity. **This is a real weakness to acknowledge.**
- **"What if someone steals a token?"** The only "token" is the public anon key — it's meant to be public, so stealing it grants nothing beyond what any visitor already has.
- **"What vulnerabilities exist?"** (1) **Open, unauthenticated, unrate-limited endpoints** that call paid LLM APIs → cost/abuse risk. (2) **RLS open to anon** → any row readable by id. (3) **pdf.js worker loaded from a third-party CDN** at runtime. (4) LLM prompt-injection surface (a crafted "report" could try to steer the model). (5) No input size limits enforced client-side beyond practical ones.
- **"How would you harden for production?"** Add per-IP/session **rate limiting** (Cloudflare in front, or a token-bucket in the function), scope RLS or move reads behind a function that checks ownership of a short-lived job token, bundle the pdf.js worker locally, add request size caps and basic prompt hardening, and put the site behind a WAF.

---

# PHASE 14 — EXTERNAL APIs / SERVICES

### Cerebras Inference (primary LLM)
- **What/why:** fast, multimodal, OpenAI-compatible chat completions — used for OCR, analysis, and chat.
- **Where:** all analysis/chat functions, via `llmChatCompletion` (and the two-pass calls inside them).
- **Request:** `POST https://api.cerebras.ai/v1/chat/completions` with `{ model: 'gemma-4-31b', messages, max_completion_tokens, ... }` (note: `max_completion_tokens`, not `max_tokens`).
- **Response:** OpenAI-shaped `choices[0].message.content` (or `tool_calls` for the camera path).
- **On failure:** retry with exponential backoff; if still failing, **fail over to Gemini**.
- **Keys/secrets:** `CEREBRAS_API_KEY` as a Supabase function secret.
- **Rate limits/traffic:** free/hosted tiers rate-limit; the retry+failover exists precisely for this. Under high traffic, cost and rate limits are the real ceiling.

### Google Gemini (fallback LLM)
- **What/why:** free-tier multimodal model used only when Cerebras is exhausted/unavailable.
- **Where:** the `catch` path of `llmChatCompletion`.
- **Request:** `POST https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` (OpenAI-compatible), `{ model: 'gemini-2.0-flash', messages, max_tokens }` (token param remapped).
- **On failure:** the pipeline errors out and the row is marked `failed`.
- **Key:** `GEMINI_API_KEY` (function secret).

### Others present but not core / not deployed
- **ElevenLabs** (`@11labs`, convai widget) — voice, removed from flow.
- **Google Drive export, payments, SMS/OTP, admin** — functions exist in the repo but aren't part of the current deployed product.

---

# PHASE 15 — ERROR HANDLING

| Failure | Where caught | User sees | Backend does | Good enough? |
|---|---|---|---|---|
| PDF worker fails to load (CDN blocked) | `pdfToImages`/`extractPdfText` try/catch → `Index` | "We couldn't read that report — PDF worker failed" + retry UI | n/a (client-side) | **No** — CDN is a SPOF; bundle worker locally |
| Report has no numeric values | analysis pass | inline error + retry | marks row `failed` | OK-ish; could be gentler |
| Cerebras 429/5xx | `retryWithBackoff` in function | (transparent) | retries, then Gemini | **Good** |
| Both LLMs fail | function catch | "couldn't read that report" | row `failed` + message | OK |
| Edge function unreachable | supabase-js | inline error, retry-in-place | n/a | OK |
| Undeployed function invoked (e.g. `store-analysis-report`) | frontend `if (error)` | (was a stray toast, now neutralised) | 404 silently | **Weak** — dead wiring should be removed |
| Analysis stuck | poll timeout (~5 min) | error state | row stays `processing` | Weak — needs a stuck-job cleaner |

The **retry-in-place** failure UX (re-render an `UploadZone` on error instead of dumping the user back to the top) is a genuinely nice touch worth mentioning.

---

# PHASE 16 — PERFORMANCE

**Expensive operations:** the LLM calls (OCR + analysis) dominate — seconds of latency and real cost per report. Everything else is trivial by comparison.

- **Client rendering:** `Index.tsx` is huge and holds a lot of state, so a careless change can cause broad re-renders, but for one user it's fine.
- **Polling:** the client polls the row on an interval — a few extra reads per analysis; negligible.
- **PDF work** happens in the browser (good — offloads the server) but a big multi-page PDF rendering to images can be memory-heavy on a weak phone.
- **No N+1 DB problem** — the DB access is a single insert + a few polled reads per job.
- **Payloads:** sending page **images** (data URLs) to the function can be large; the text path is much lighter and is preferred.

**At scale:**
- **100 users:** fine.
- **1,000 users:** LLM rate limits/cost become the constraint; edge-function concurrency matters.
- **100,000 users:** you must add rate limiting, a real job queue, caching of identical reports, and cost controls; the free Supabase/LLM tiers won't hold.
- **1,000,000 users:** it's an LLM-cost and throughput problem, not a Postgres problem. First thing to break: your Cerebras/Gemini quota and your wallet.

---

# PHASE 17 — SCALABILITY

Relevant concepts for *this* project:
- **Stateless backend:** edge functions are already stateless — they scale horizontally by nature. Good.
- **Object storage/CDN:** the frontend is static → a CDN (Vercel/Cloudflare Pages) scales reads trivially.
- **Rate limiting:** the biggest missing piece; needed before any real launch (put Cloudflare in front, or token-bucket per IP).
- **Queues:** at high volume, replace "insert row + `waitUntil`" with a proper queue + workers so you can throttle LLM calls and absorb spikes.
- **Caching:** identical/near-identical reports could be cached; the DB job store already partly acts as a result cache.
- **DB scaling:** low priority — the table is an ephemeral job store, not a growing dataset.

**If usage grew:**
- **10×:** add rate limiting + move to Supabase Pro (removes the free-tier auto-pause), monitor LLM spend.
- **100×:** introduce a queue + worker pool, aggressive rate limits, and per-user/day caps; consider a cheaper OCR path.
- **1,000×:** dedicated inference capacity or a self-hosted model, a real queue (e.g. SQS/PGMQ), caching, and cost-based admission control.

---

# PHASE 18 — ALGORITHMS & DATA STRUCTURES

**Be honest: there is little classical DSA here.** The genuinely algorithmic bits:
- **Exponential backoff with jitter** (`retryWithBackoff` on client and in functions) — O(retries); the point is resilience, not complexity.
- **Batched-concurrent OCR** in `analyze-medical-report` — pages are processed in batches of `BATCH_SIZE` with `CONCURRENCY` in parallel (a simple windowed `Promise.all` loop). Trade-off: throughput vs. provider rate limits.
- **Weighted scoring with re-normalization** (`healthScoreCalculator`) — a weighted average over *measured* systems plus a penalty; O(#labs). Not advanced, but has real edge cases (units, sex, missing systems).
- **Regex range parsing** (`checkIfValueWithinRange`) — parses "12-15", "<6.0", "Male 13-17 Female 12-15" and (now) picks the sex-appropriate sub-range. This is the fiddliest correctness-sensitive code.
- **Robust JSON extraction** — strips markdown fences / extracts the outermost `{...}` when the LLM doesn't return clean JSON.

Don't dress any of this up as "advanced algorithms" — an interviewer will respect "it's mostly glue and heuristics; the hard part was correctness and resilience, not asymptotic complexity."

---

# PHASE 19 — DESIGN DECISIONS (with strong answers)

| Decision | Why | Alternatives | Trade-off | Interview answer |
|---|---|---|---|---|
| **Serverless (Supabase edge) not a Node server** | No infra to run; keys off client; bundled with DB | Express on a VM/Lambda | Less control, cold starts | "The workload is bursty and I/O-bound around an LLM. Serverless functions scale to zero and to spikes without me running a server, and they keep the API keys server-side." |
| **Async job + polling** (`waitUntil`) | Analysis outlasts one HTTP request | Streaming/websockets | Polling is chattier | "Analysis can take 30s+, past a normal request budget, so I return a job id immediately and do the work in a background task, and the client polls. Simple and robust; websockets would be nicer UX but more moving parts." |
| **Cerebras + Gemini failover** | Speed + resilience on a single free-ish provider | One provider | More code, two keys | "A single provider's rate limits were a real risk, so I wrapped calls in retry/backoff and fail over to a second provider. It's redundancy for a critical path." |
| **Account-free / ephemeral** | Privacy + simplicity; no SMS provider | Phone-OTP accounts | No history, open endpoints | "For a privacy-sensitive medical tool, not collecting identity is a feature. It also removed the whole auth/SMS surface. The cost is no saved history and open endpoints — which I'd rate-limit for production." |
| **Client-side scoring/risk** | Cheap, instant, no extra backend | Server compute / real model | Heuristic, not validated | "The score/risk are heuristics from the LLM's structured output, computed in the browser so there's no extra round-trip. I deliberately present risk as a *relative index*, not a probability, because I don't have a validated model." |
| **JSONB single table** | Result is one document | Normalised tables | Can't query inside results | "The app consumes the analysis as a whole and never queries inside it relationally, so JSONB is the right fit and tolerates the evolving LLM shape." |
| **pdf.js in the browser** | Offload PDF work to the client | Server-side parse | CDN worker dependency | "Doing extraction client-side keeps the function light and cheap. The one flaw is the worker loads from a CDN — I'd bundle it locally." |

---

# PHASE 20 — "WHY DID YOU USE X?" (beginner → strong answer → follow-up)

**Why React?**
- *Beginner:* it's the standard way to build interactive UIs from reusable pieces.
- *In this project:* the whole UI, with lots of stateful flow in `Index.tsx`.
- *Strong answer:* "It's the most widely-supported component model, and the ecosystem (Radix/shadcn, Recharts, router) let me assemble a polished UI fast."
- *Follow-up:* "Why not Next.js?" → "The app is a client-heavy SPA talking to Supabase; I didn't need SSR or a Node server, so a plain Vite SPA was simpler and cheaper to host."

**Why Supabase (not Firebase / custom)?**
- *In this project:* Postgres + edge functions + storage in one place, invoked from the client SDK.
- *Strong answer:* "It gave me a real SQL database, serverless functions, and storage without standing up infrastructure, and the client SDK made wiring trivial. Firebase would've meant NoSQL; a custom backend meant ops I didn't want for a solo project."
- *Follow-up:* "Downsides?" → "Vendor lock-in and the free-tier auto-pause; for production I'd move to Pro."

**Why Cerebras + Gemini?**
- *Strong answer:* "Cerebras is extremely fast and multimodal with an OpenAI-compatible API, which suited an OCR-plus-analysis pipeline where latency matters. Gemini's free tier is a reliable multimodal fallback, so I made the pipeline fail over automatically."
- *Follow-up:* "Why not OpenAI/Anthropic?" → "Cost and speed for this volume; and the OpenAI-compatible shape meant I could swap providers with minimal code."

**Why no login?**
- *Strong answer:* "Privacy and simplicity. A medical tool that collects no identity is easier to trust, and it removed the entire auth/SMS surface. The trade-off is open endpoints, which I'd protect with rate limiting."

**Why polling (not websockets)?**
- *Strong answer:* "Simplicity and reliability for an async job. Polling a status row is trivial to reason about; realtime would be a nicer UX upgrade later."

---

# PHASE 21 — CROSS-QUESTIONING / INTERVIEWER GRILL

> Chains go easy → hard. Practice saying the candidate lines out loud.

**Chain 1 — the basics**
- Q: "What does it do?" → A: (30-sec pitch).
- Q: "How does the frontend talk to the backend?" → A: "Via the supabase-js client — `functions.invoke()` for edge functions and PostgREST reads for the results table, all HTTPS."
- Q: "How *exactly* does an analysis start?" → A: "The browser extracts text or images from the PDF, then POSTs them to the `analyze-medical-report` edge function."
- Q: "And then?" → A: "The function inserts a `pdf_analyses` row with status `processing`, returns the id immediately, and finishes the analysis in a background task via `EdgeRuntime.waitUntil`."
- Q: "Why not just finish in the request?" → A: "Analysis can exceed the request budget, so I return early and the client polls the row."
- Q: "What happens if the function crashes mid-analysis?" → A: "The row stays `processing`; the client eventually times out and shows an error. That's a gap — I'd add a stuck-job sweeper."

**Chain 2 — the LLM**
- Q: "Where does the 'AI' actually happen?" → A: "Inside the edge functions — Cerebras `gemma-4-31b` does OCR and the analysis."
- Q: "What if Cerebras is down?" → A: "Each call has retry with exponential backoff, and if it's exhausted it fails over to Google Gemini."
- Q: "Show me where." → A: "`llmChatCompletion` in `analyze-medical-report/index.ts` — Cerebras in the `try`, Gemini in the `catch`."
- Q: "How do you know the LLM's output is valid?" → A: "I force a JSON structure via the prompt and parse it with a fallback extractor that strips fences and grabs the outermost object; the camera path uses tool-calling for stricter structure."
- Q: "What if it hallucinates a value?" → A: "That's the core risk of an LLM pipeline — I mitigate by grounding on the report's own reference ranges and filtering out in-range values, but I don't have ground-truth validation. I'd add cross-checks and a human-review path for production."

**Chain 3 — the database**
- Q: "What's your schema?" → A: "One table, `pdf_analyses` — a job/result store."
- Q: "Why is `id` TEXT?" → A: "The function generates a string id and inserts it; a UUID column rejected it, so it's TEXT."
- Q: "Why JSONB for the result?" → A: "The UI consumes it as one document and never queries inside it; JSONB fits and tolerates schema drift."
- Q: "Concurrency on a row?" → A: "Each job owns a unique id, so same-row races don't really occur; it'd be last-write-wins otherwise."
- Q: "RLS?" → A: "Enabled, but open to anon — a deliberate simplification for an account-free ephemeral app, and a real weakness I'd tighten."

**Chain 4 — security/scale**
- Q: "Anyone can call your analyze endpoint?" → A: "Yes — it's public with `--no-verify-jwt`. That's the account-free design."
- Q: "Isn't that a cost bomb?" → A: "It is — unrate-limited endpoints hitting paid LLMs. Before launch I'd add per-IP rate limiting via Cloudflare and per-session caps."
- Q: "How would you rate-limit inside the function?" → A: "A token bucket keyed by IP/anon-id in a small Postgres/KV table, or push it to the edge with Cloudflare, which is cheaper and keeps the abuse off the function entirely."
- Q: "10× users — what breaks first?" → A: "LLM rate limits and cost, and the Supabase free-tier pause. Postgres is fine."

**Chain 5 — the honest one**
- Q: "How much of this did you write vs. AI?" → A: "I built it with heavy AI assistance and then reverse-engineered and hardened it myself — I migrated the backend to my own Supabase project, switched the LLM to Cerebras with a Gemini fallback, removed auth, redesigned the UI, and fixed real accuracy bugs like unit handling and sex-specific ranges. I can walk you through any of those changes in the code."
- Q: "Name a bug you fixed." → A: "The health score treated *untested* body systems as perfect 100s, so a report with a flagged abnormality still scored 95. I re-normalised over measured systems and added an abnormality penalty. Also, an HbA1c value was being read as *hemoglobin* because of a substring name-match, turning a normal HbA1c into 'severe anemia' — I excluded the glycated-hemoglobin aliases."

**Additional grill prompts to rehearse** (write your own candidate answers): "Why is the analysis client-side extraction but server-side OCR?" · "What's in `EdgeRuntime.waitUntil` and why?" · "Why does the frontend still invoke `store-analysis-report` if it isn't deployed?" · "What does `applyMedicalSignificanceFilter` actually remove and why?" · "Why is the risk chart labelled 'relative index'?" · "What happens on a 20-page PDF on a cheap phone?" · "Why five different PDF generators?" · "What's the anon `user_id` for if there's no auth?" · "Why Deno and not Node?" · "How would realtime replace polling?"

---

# PHASE 22 — INTERVIEW QUESTIONS BY DIFFICULTY

**LEVEL 1 — Beginner**
- "What does the app do?" → the pitch.
- "What's the frontend framework?" → React + Vite + TS.
- "Where's the data stored?" → Supabase Postgres, one table `pdf_analyses`.
- "Is there a login?" → No; it's account-free by design.

**LEVEL 2 — Intermediate**
- "Walk me from upload to result." → Phase 7 trace.
- "Why polling?" → async job outlives the request.
- "How are secrets kept safe?" → only the public anon key is on the client; LLM/service keys are function secrets.
- "What's RLS and how is it set here?" → row-level security; open to anon (deliberate, a weakness).

**LEVEL 3 — Advanced**
- "Explain the failover and retry precisely." → `retryWithBackoff` + Cerebras→Gemini in `llmChatCompletion`.
- "How would you add rate limiting without breaking the account-free UX?" → edge WAF / token bucket by IP+anon-id.
- "How do you guarantee the LLM returns parseable JSON?" → prompt + fallback extraction + tool-calling on the camera path (and Gemini's JSON mode in the triage fallback).
- "What's the failure mode if `EdgeRuntime.waitUntil` isn't supported?" → the code guards with a `typeof EdgeRuntime` check; otherwise the background work wouldn't run.

**LEVEL 4 — Senior**
- "This calls paid APIs from an open endpoint — defend or fix it." → acknowledge; rate limit + caps + WAF.
- "Your scoring is heuristic — how would you make it defensible?" → validated risk equations (ASCVD/Framingham) that need inputs you don't collect (BP), or present qualitative guidance; you already reframed risk as an index.
- "How do you handle a malicious 'report' that's really a prompt injection?" → constrain output schema, ignore instructions in content, and treat model output as untrusted data.

**LEVEL 5 — "expose that you don't understand your own project"**
- "Why is `TanStack Query` installed if your main flow doesn't use it?" → honest: it came with the scaffold and I lean on local state + direct supabase calls; I'd either adopt it for the polling or remove it.
- "You invoke `store-analysis-report`/`send-admin-alert` — where are those deployed?" → they aren't on the current backend; that's dead wiring I neutralised/should remove.
- "Why are `pdf-parse` and `pdf2pic` in `package.json`?" → unused leftovers; the real PDF work is `pdfjs-dist`. I'd prune them.
- "Your migration says `id text default (gen_random_uuid())::text` — why the cast?" → because the function supplies a *string* id, so the column is TEXT; the cast lets the DB still auto-generate a text id when none is supplied (camera path).

---

# PHASE 23 — QUESTIONS AN INTERVIEWER COULD ASK FROM YOUR CODE

- **"Why is `useAuth` returning a fake user?"** → to remove login centrally: every gate checks `isAuthenticated`/`user`, so a synthetic anon user opens them all without editing ten files.
- **"What happens if `result` is null when you render?"** → components guard for missing fields; but a partially-failed analysis could render thin — worth a defensive check.
- **"Why `await` the invoke but not the analysis?"** → the invoke returns the job id fast; the analysis runs in `waitUntil` on the server, so the client only awaits the *start*.
- **"Why is the PDF worker `workerSrc` a CDN URL?"** → scaffold default; it's a runtime SPOF I'd bundle locally.
- **"Why `--no-verify-jwt` on deploy?"** → so the account-free anon client can call the functions without a user JWT.
- **"What if `checkIfValueWithinRange` gets a weird range string?"** → it tries several regex shapes and falls back; unparseable ranges may mis-classify — a known fragility.
- **"Why is `Index.tsx` 2,500 lines?"** → organic growth; it should be split into hooks (`useAnalysis`, `usePolling`) and section components. Honest.
- **"What renders 1,000 times if you're not careful?"** → `Index` holds broad state; an unmemoised change could cascade. For one user it's fine; at scale I'd split state.

---

# PHASE 24 — BUGS / WEAKNESSES / RED FLAGS (brutally honest)

For each: **problem → why it's a problem → how an interviewer notices → how to answer → how to fix.**

1. **Dead edge-function wiring.** The frontend `functions.invoke()`s `store-analysis-report`, `send-admin-alert`, `send-otp`, `verify-otp`, `export-to-drive`, `check-admin-role`, etc., but those aren't deployed on the current backend. → They 404 silently. → An interviewer greps invokes vs. deployed functions. → *"Those are leftovers from the pre-rework product; the calls fail gracefully and I neutralised the user-visible ones. I'd delete the dead calls and functions."* → Remove the calls; prune the functions.
2. **~40 unused edge functions** in the repo (admin, payments, drive, demo links). → Confusing, inflates surface. → Obvious on `ls supabase/functions`. → *"Scaffold/iteration residue; not part of the shipped product."* → Delete or move to an archive branch.
3. **Unused npm deps:** `pdf-parse`, `pdf2pic`, `@xyflow/react`, ElevenLabs. → Bundle bloat, misleading. → `grep` finds no imports. → *"Leftovers; I'd prune them."* → Remove from `package.json`.
4. **Open, unauthenticated, unrate-limited endpoints calling paid LLMs.** → Cost/abuse. → Immediate senior concern. → *"Deliberate account-free design; production needs rate limiting."* → Cloudflare/token bucket + caps.
5. **RLS `using(true)` to anon.** → Any row readable by id. → They ask about RLS. → *"Ephemeral, anonymous, unguessable ids — but yes, I'd tighten it."* → Scope reads behind a function + job token.
6. **Heuristic, hardcoded medical thresholds** (score/risk in the browser). → Not clinically validated; brittle. → They probe the numbers. → *"They're heuristics from the LLM output; risk is shown as a relative index, not a probability."* → Validated models / clearer disclaimers.
7. **pdf.js worker from a CDN at runtime.** → External SPOF; blocked networks break upload. → They ask about offline/enterprise. → *"Known flaw; bundle it locally."* → Copy worker to `public/`, point `workerSrc` local.
8. **`Index.tsx` god component (~2,500 lines).** → Hard to maintain/test. → They open the file. → *"Organic growth; I'd extract hooks and section components."* → Refactor.
9. **Five overlapping PDF generators.** → Duplication. → They see `generate*Pdf`. → *"Consolidate into one parameterised generator."* → Merge.
10. **No automated tests.** → Regressions. → They ask "how do you test?" → *"Manual end-to-end today; I'd add unit tests for the calculators/range parser and a smoke test for the pipeline."* → Add Vitest + a Playwright smoke test.
11. **`TanStack Query` mounted but barely used.** → Inconsistent data strategy. → They ask why it's there. → *"Scaffold; I use local state + direct calls. I'd adopt or remove it."*
12. **Stuck-job handling.** → A crashed analysis leaves a `processing` row. → They ask about failures. → *"The client times out; I'd add a sweeper to mark stale rows failed."*
13. **Supabase config for auth despite no auth** (`persistSession`, `localStorage`). → Vestigial. → Minor. → *"Leftover from the scaffold."*
14. **Vestigial secondary routes** (`/admin`, `/analytics`, `/my-reports`) wired to undeployed backend. → Broken pages. → They click around. → *"Shelved with the account features; I'd remove or clearly disable them."*

---

# PHASE 25 — "IF I WERE TO REBUILD IT"

- **Today, generally:** split `Index.tsx` into hooks/components; delete dead functions/deps; add rate limiting; bundle the pdf.js worker; add tests.
- **2× dev time:** proper job queue + realtime (drop polling); a validated risk model or an explicit "informational only" framing everywhere; an admin/observability dashboard.
- **10× users:** rate limiting + caps + caching identical reports + Supabase Pro; monitor LLM spend.
- **Security first:** scope RLS, put endpoints behind a WAF with per-IP limits, add request-size caps and prompt-injection hardening, and a short-lived job token so only the uploader can read a result.
- **Latency first:** prefer the **text** path over images (much smaller payloads, faster OCR); stream partial results; cache.
- **DB with 100M records:** irrelevant to the current ephemeral design — but if you kept history you'd partition by time, index `user_id`/`status`, and add a TTL.
- **External API down:** already handled by Cerebras→Gemini failover; add a third provider or a degraded "text-only" mode.
- **20 developers:** enforce module boundaries, delete dead code, add CI (lint+test+typecheck), a component library, and per-feature ownership.

---

# PHASE 26 — DEPLOYMENT & PRODUCTION

**Frontend (static):**
```
source → npm install → vite build → dist/  → static host (Vercel / Cloudflare Pages) → domain + HTTPS
```
- **Env (build-time, public):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- **Build cmd:** `npm run build` (`vite build`); **dev:** `npm run dev` (`vite`); **preview:** `vite preview`.

**Backend (Supabase):**
```
supabase link --project-ref <ref>
supabase db push                       # apply migrations (the clean baseline)
supabase secrets set CEREBRAS_API_KEY=... GEMINI_API_KEY=...
supabase functions deploy analyze-medical-report --no-verify-jwt
supabase functions deploy process-pdf-report --no-verify-jwt
supabase functions deploy clinical-triage-chat --no-verify-jwt
supabase functions deploy get-analysis-result --no-verify-jwt
```
- **Secrets:** `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, and the auto-provided `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_URL`.
- **Prod vs dev:** dev = Vite on localhost against the live Supabase project; prod = static `dist/` on a CDN against the same backend.
- **Logging:** `console.*` visible in Supabase function logs. **No CI/CD, no Docker, no monitoring** in the repo.
- **Production must-dos** (call these out): Supabase **Pro** (free tier auto-pauses after ~7 days idle — the exact thing that broke the original project), rate limiting, and the pdf.js worker fix.

---

# PHASE 27 — GIT & DEVELOPMENT WORKFLOW

- **Repo:** `github.com/zayedongit/diagassist-ai`, single `main` branch, public.
- **`.gitignore`:** ignores `node_modules`, `dist`, `.env*` (secrets kept out), and `*.bak*` (local scratch backups).
- **Migrations:** the 57 original migrations were **archived** to `supabase/_archive_migrations/` (moved, not deleted) so history is intact but a fresh project pushes only the clean baseline.
- **Dependency management:** npm (`package-lock.json`) — a `bun.lock`/`bun.lockb` also exist from the scaffold.
- **Build:** Vite; **lint:** ESLint (flat config); **tests:** none.
- **If asked "how did you develop this?"** → *"I started from an AI app-builder scaffold, then took ownership: I migrated the backend to my own independent Supabase project (consolidating a messy 57-migration history into one clean baseline), switched the analysis LLM to Cerebras with a Gemini fallback, removed authentication to make it privacy-first and account-free, redesigned the UI, and fixed a batch of real medical-accuracy bugs. I worked directly against the live Supabase backend and validated each change end-to-end."*

---

# PHASE 28 — PROJECT STORY (honest)

1. **Problem:** patients can't read their own lab reports.
2. **Idea:** an app that explains a report in plain language.
3. **Requirements:** accept PDF/photo; extract values; explain + score; be fast; be private.
4. **Architecture:** static React SPA + Supabase (Postgres, Deno edge functions, storage) + an LLM pipeline.
5. **Implementation:** client-side PDF extraction → edge function OCR+analysis → async job + polling → client-side score/risk/plan → downloadable PDFs.
6. **Challenges (verified):** (a) migrating off the original hosted backend to an independent Supabase project **without losing git history**, which meant consolidating a tangled 57-migration history into one clean baseline; (b) an `id`-type mismatch (string id vs. UUID column) that broke inserts; (c) missing columns the function expected; (d) making the LLM return reliable JSON; (e) resilience — retries + Cerebras→Gemini failover.
7. **Key decisions:** account-free/ephemeral; dual-LLM failover; JSONB job store; client-side heuristics.
8. **Bugs encountered (verified):** untested-systems-scored-as-100 inflating the health score; HbA1c mis-read as hemoglobin (→ false "severe anemia"); sex-agnostic hemoglobin/creatinine ranges; fabricated risk percentages (reframed to a relative index); PDF worker CDN failure in restricted networks.
9. **Improvements made:** unit normalization, sex-specific ranges, honest risk framing, tougher scoring, provider failover, retry-in-place error UX.
10. **Results:** **[VERIFY — you must supply real metrics.** The repo has no analytics/usage data, so don't claim user numbers. You *can* honestly say "it works end-to-end on real PredLabs reports" if that's true.]
11. **What I learned:** serverless job patterns, LLM-pipeline resilience, the difference between "looks impressive" and "is correct" in medical logic, and how to reverse-engineer and harden an AI-scaffolded codebase.
12. **What's next:** rate limiting, tests, refactor `Index.tsx`, and either a validated risk model or clearer non-diagnostic framing.

> **[VERIFY]** Anything about real users, uptime, or accuracy metrics is *not* in the repo — prepare those honestly yourself or don't claim them.

---

# PHASE 29 — RAPID FIRE (100)

Short, interview-ready. Prioritised to this project.

1. **What is an SPA?** One HTML page; JS swaps views client-side. 2. **What is Vite?** A fast dev server/bundler. 3. **What is React?** A component-based UI library. 4. **What is a component?** A reusable, self-contained piece of UI. 5. **What is state?** Data a component remembers between renders. 6. **What causes a re-render?** State/prop changes. 7. **What is a hook?** A function to use React features in function components. 8. **What is `useState`?** Declares local state. 9. **What is `useEffect`?** Runs side effects after render. 10. **What is a prop?** Data passed from parent to child. 11. **What is TypeScript?** Typed JavaScript. 12. **What is Tailwind?** Utility-first CSS. 13. **What is shadcn/ui?** Prebuilt Radix-based components. 14. **What is Radix?** Accessible headless UI primitives. 15. **What is React Router?** Client-side routing. 16. **What is a route?** A URL → component mapping. 17. **What is Supabase?** A managed Postgres + functions + storage backend. 18. **What is Postgres?** A relational SQL database. 19. **What is an edge function?** A serverless function run near the user. 20. **What is Deno?** A secure JS/TS runtime (runs the functions). 21. **What is serverless?** No server you manage; scales on demand. 22. **What is an API?** A contract to request/receive data. 23. **What is REST?** Resource-oriented HTTP APIs. 24. **What is an endpoint?** A callable URL. 25. **What is HTTP?** The web request/response protocol. 26. **What is HTTPS?** HTTP over TLS (encrypted). 27. **What is JSON?** A text data format. 28. **What is JSONB?** Postgres binary JSON column type. 29. **What is a primary key?** A unique row identifier. 30. **What is a foreign key?** A reference to another table's key (none here). 31. **What is an index?** A structure to speed lookups. 32. **What is RLS?** Row-level security — per-row access rules. 33. **What is the anon key?** Supabase's public client key. 34. **What is the service-role key?** Supabase's secret admin key (functions). 35. **What is an environment variable?** Config injected at build/runtime. 36. **What is CORS?** Browser rules for cross-origin requests. 37. **What is a promise?** A future value. 38. **What is async/await?** Syntax for promises. 39. **Why await the invoke?** To get the job id back. 40. **What is polling?** Repeatedly asking for status. 41. **What is a webhook/websocket?** Push-based comms (not used; polling instead). 42. **What is a background task?** Work that continues after the response (`waitUntil`). 43. **What is `EdgeRuntime.waitUntil`?** Keeps the function alive for async work post-response. 44. **What is an LLM?** A large language model. 45. **What is OCR?** Turning images of text into text. 46. **What is a multimodal model?** One that takes text+images. 47. **What is Cerebras here?** The primary LLM (`gemma-4-31b`). 48. **What is Gemini here?** The fallback LLM. 49. **What is a fallback?** A backup path on failure. 50. **What is retry/backoff?** Retrying with growing delays. 51. **What is jitter?** Randomness added to backoff. 52. **What is rate limiting?** Capping request frequency (missing here). 53. **What is idempotency?** Same request → same effect (each job has a unique id). 54. **What is a race condition?** Concurrent ops clashing. 55. **What is last-write-wins?** Latest write overwrites. 56. **What is a migration?** A versioned schema change. 57. **What is a trigger?** DB code that runs on write (`set_updated_at`). 58. **What is a bucket?** A storage container (`medical-reports`). 59. **What is jsPDF?** Client-side PDF generation. 60. **What is pdfjs-dist?** Mozilla's PDF reader for the browser. 61. **What is a data URL?** Base64-encoded inline file. 62. **What is a CDN?** Edge network serving static assets. 63. **What is a SPOF?** Single point of failure (the pdf.js CDN). 64. **What is Recharts?** A React charting lib. 65. **What is zod?** Runtime schema validation. 66. **What is react-hook-form?** Form state/validation. 67. **What is sonner?** Toast notifications. 68. **What is TanStack Query?** Server-state caching (underused here). 69. **What is a context provider?** Shares state down the tree (`AuthProvider`). 70. **What is localStorage?** Browser key-value storage (anon id, resume state). 71. **What is a bundle?** The built JS/CSS output. 72. **What is tree-shaking?** Removing unused code at build. 73. **What is SSR?** Server-side rendering (not used). 74. **What is a static site?** Prebuilt files served from a CDN. 75. **What is Vercel/Cloudflare Pages?** Static hosting w/ auto-deploy. 76. **What is a JWT?** A signed token (the anon key is one; verify_jwt is off). 77. **What is `--no-verify-jwt`?** Function accepts calls without a user JWT. 78. **What is prompt injection?** Malicious instructions inside content. 79. **What is a heuristic?** A rule-of-thumb, not a proven model (the score). 80. **What is a weighted average?** Sum of weighted parts (the score). 81. **What is normalization (units)?** Converting to a common unit. 82. **What is a reference range?** The lab's normal range for a value. 83. **What is HbA1c?** A 3-month blood-sugar marker. 84. **Why did HbA1c break?** It matched "hemoglobin" by substring. 85. **What is lymphopenia?** Low lymphocytes (the demo report's finding). 86. **What is ephemeral data?** Not stored long-term. 87. **What is account-free?** No login. 88. **What is a god component?** One file doing too much (`Index.tsx`). 89. **What is dead code?** Present but unused (many functions/deps). 90. **What is tech debt?** Shortcuts you'll pay for later. 91. **What is horizontal scaling?** More instances (functions do this). 92. **What is vertical scaling?** Bigger instance. 93. **What is a queue?** Buffer for async jobs (would help at scale). 94. **What is caching?** Reusing computed results. 95. **What is connection pooling?** Reusing DB connections (Supabase-managed). 96. **What is a WAF?** Web application firewall (would add). 97. **What is CI/CD?** Automated build/test/deploy (none yet). 98. **What is linting?** Static code checks (ESLint present). 99. **What is a smoke test?** A quick end-to-end sanity test (none yet). 100. **What's the one-line pitch?** "Upload a lab report, get it explained in plain language."

---

# PHASE 30 — PROJECT CHEAT SHEET

- **PROJECT:** Diagassist
- **PURPOSE:** Turn a medical lab report (PDF/photo) into a plain-language health briefing.
- **STACK:** React 18 + Vite + TS + Tailwind/shadcn (frontend); Supabase Postgres + Deno Edge Functions + Storage (backend); Cerebras `gemma-4-31b` + Gemini `gemini-2.0-flash` (LLM); jsPDF, pdfjs-dist, Recharts.
- **ARCHITECTURE:** Static SPA → Supabase edge function (async job via `waitUntil`) → LLM OCR+analysis → Postgres row → client polls → client-side score/risk/plan/PDF.
- **DATABASE:** One table `pdf_analyses` (TEXT id, JSONB `result`, `status` state machine); RLS open to anon; `medical-reports` storage bucket.
- **KEY APIs:** `analyze-medical-report`, `process-pdf-report`, `clinical-triage-chat`, `get-analysis-result`, `voiceflow-chat`.
- **AUTH:** None — synthetic anonymous user (`useAuth.tsx`); account-free, ephemeral.
- **MOST IMPORTANT FILES:** `src/pages/Index.tsx`, `src/utils/pdfToImages.ts`/`extractPdfText.ts`, `src/utils/healthScoreCalculator.ts`, `src/utils/riskProjection.ts`, `supabase/functions/analyze-medical-report/index.ts`, `supabase/migrations/…_diagassist_baseline.sql`, `src/integrations/supabase/client.ts`, `src/hooks/useAuth.tsx`.
- **MOST IMPORTANT FUNCTIONS:** `processClientSide`, `llmChatCompletion`, `applyMedicalSignificanceFilter`, `checkIfValueWithinRange`, `calculateHealthScore`, `retryWithBackoff`.
- **KEY DESIGN DECISIONS:** serverless; async job + polling; dual-LLM failover; account-free/ephemeral; client-side heuristics; JSONB job store.
- **BIGGEST TECHNICAL CHALLENGES (verified):** independent-backend migration + 57→1 migration consolidation; TEXT-vs-UUID id bug; reliable LLM JSON; provider failover; medical-accuracy bugs.
- **KNOWN WEAKNESSES:** open/unrate-limited endpoints; RLS open to anon; heuristic scoring; pdf.js CDN SPOF; dead functions/deps; god component; no tests.
- **SCALABILITY:** LLM cost/limits are the ceiling, not Postgres; add rate limiting + queue + caching + Supabase Pro.
- **SECURITY:** no auth by design; keys server-side; needs rate limiting + tighter RLS + WAF.
- **WHAT I'D IMPROVE:** rate limiting, tests, refactor `Index.tsx`, bundle pdf.js worker, prune dead code, validated risk model / clearer disclaimers.

---

# PHASE 31 — MEMORIZE THESE (the 25 must-knows)

| Concept | What it means | In this project | One-liner to remember |
|---|---|---|---|
| SPA | one-page JS app | the whole frontend | "It's a Vite React SPA." |
| Edge function | serverless handler | the backend logic | "All server logic is Supabase Deno functions." |
| Async job + polling | return early, finish later, client checks | `waitUntil` + poll `pdf_analyses` | "Analysis is a background job the client polls." |
| `EdgeRuntime.waitUntil` | keep function alive post-response | in `analyze-medical-report` | "It lets the analysis outlive the HTTP response." |
| Cerebras primary / Gemini fallback | two LLM providers | `llmChatCompletion` | "Cerebras first, Gemini on failure." |
| Retry/backoff | resilient calls | `retryWithBackoff` | "Every model call retries with backoff." |
| `pdf_analyses` | the one table | job + result store | "One table, JSONB result, TEXT id." |
| TEXT id | string primary key | function generates `analysis_...` | "TEXT because the function makes the id." |
| JSONB result | document column | the analysis output | "The result is a JSON document, not normalised." |
| RLS open to anon | permissive access | the policy `using(true)` | "RLS is open — a deliberate weakness." |
| Account-free | no login | `useAuth` synthetic user | "No auth by design; ephemeral." |
| Anon `user_id` | per-browser id | from localStorage | "Correlates a job, not a person." |
| Client-side scoring | browser heuristics | `healthScoreCalculator` | "Score/risk are computed in the browser." |
| Risk = relative index | not a probability | `riskProjection` | "Risk is a relative index, not a validated %." |
| pdf.js in browser | client extraction | `extractPdfText`/`pdfToImages` | "The browser reads the PDF; the server does OCR only if images." |
| CDN worker | external dependency | `workerSrc` jsdelivr | "The pdf.js worker loads from a CDN — a SPOF." |
| Service-role key | function DB writes | edge functions | "Functions write via service-role, bypassing RLS." |
| `--no-verify-jwt` | public functions | deploy flag | "Endpoints are public for the account-free client." |
| Vision OCR | image→text via LLM | `analyze-medical-report` | "OCR is an LLM vision call, batched/concurrent." |
| `applyMedicalSignificanceFilter` | drop in-range labs | in the function | "It removes values inside the lab's own range." |
| `checkIfValueWithinRange` | parse ranges, sex-aware | in the function | "It parses reference ranges, picking the sex-specific one." |
| God component | too much in one file | `Index.tsx` | "`Index.tsx` orchestrates everything — a refactor target." |
| Dead code | unused functions/deps | ~40 functions, some npm deps | "A lot of the repo is inactive residue." |
| Free-tier pause | Supabase idles | production risk | "Free Supabase pauses when idle — use Pro to launch." |
| Provider failover | keep pipeline up | Cerebras→Gemini | "Resilience is the point of the dual-LLM design." |

---

# PHASE 32 — LEARNING GAPS (study these separately)

| Priority | Learn | Why it matters | Where it's used | Question that exposes the gap |
|---|---|---|---|---|
| **CRITICAL** | How serverless functions actually run (cold starts, statelessness, `waitUntil`) | It's your whole backend | all edge functions | "What happens between the response and the analysis finishing?" |
| **CRITICAL** | LLM API mechanics (tokens, JSON reliability, cost, rate limits) | The pipeline is LLM-centric | `llmChatCompletion` | "How do you keep the model from returning junk, and what does it cost?" |
| **CRITICAL** | Postgres RLS + Supabase auth model | Security answers hinge on it | schema/policies | "Explain your RLS policy and its risk." |
| **HIGH** | React rendering + state management fundamentals | To defend `Index.tsx` and re-renders | frontend | "What triggers a re-render and how do you prevent needless ones?" |
| **HIGH** | Async JS (promises, `await`, concurrency, `Promise.all`) | The whole flow is async | polling, batched OCR | "Why await the invoke but not the analysis?" |
| **HIGH** | HTTP/REST + CORS + how supabase-js calls functions | The client↔backend contract | `functions.invoke` | "What exactly goes over the wire on upload?" |
| **MEDIUM** | Rate limiting & abuse prevention patterns | Biggest production gap | (missing) | "How would you stop someone draining your LLM quota?" |
| **MEDIUM** | pdf.js internals (worker, text vs. render) | Explains the CDN flaw + payloads | PDF utils | "Why does upload break on a locked-down network?" |
| **MEDIUM** | Basic medical-reference-range logic | To defend the scoring honestly | calculators | "Why did HbA1c get scored as anemia, and how did you fix it?" |
| **LOW** | Recharts / jsPDF specifics | Only for detail questions | charts/PDF | "How is the risk chart rendered?" |

---

# FINAL SELF-TEST (answer these yourself — no answers provided)

1. Trace, file by file, what happens from the moment a user drops a PDF to the moment results render.
2. Why is `pdf_analyses.id` a TEXT column and not UUID? What broke when it was UUID?
3. Explain `EdgeRuntime.waitUntil` and what would happen if you removed it.
4. Where exactly does the Cerebras→Gemini failover live, and what triggers it?
5. What does `applyMedicalSignificanceFilter` remove, and how could that hide a real abnormality?
6. Why does the frontend still call `store-analysis-report` and `send-admin-alert`? What happens when it does?
7. Which npm dependencies are unused, and how would you prove it?
8. How is "login removed" actually implemented in one file? Name it.
9. What is the anon `user_id` for if there are no accounts?
10. Explain the RLS policy on `pdf_analyses` and one concrete way it could be abused.
11. Why is the risk view labelled a "relative index" and not a probability?
12. Walk through `checkIfValueWithinRange` on the string "Male 13-17 Female 12-15" for a female patient with Hb 16.5.
13. Why did a normal HbA1c get scored as "severe anemia", and what was the fix?
14. Why did a CBC with a flagged abnormality still score 95 before your fix?
15. What is the exact payload difference between the text path and the image path to `analyze-medical-report`?
16. What happens to the `pdf_analyses` row if the background task throws halfway?
17. How does the client know when analysis is done? Name the mechanism and the alternative you rejected.
18. Why did you deploy functions with `--no-verify-jwt`?
19. Where are the Cerebras and Gemini keys stored, and why not in the frontend?
20. What is the single biggest cost/abuse risk in this design, and how would you fix it without adding accounts?
21. Why is `Index.tsx` a problem, and how would you split it?
22. Why are there five PDF generators, and how would you consolidate them?
23. What breaks first at 100,000 users — and why is it not Postgres?
24. How would you add rate limiting inside an edge function? What state would you need?
25. Why does upload fail on a network that blocks jsdelivr, and how do you fix it permanently?
26. What is `TanStack Query` doing in this project right now, honestly?
27. Explain the difference between the frontend `retryWithBackoff` and the one inside the edge functions.
28. What does the clinical assessment (`clinical-triage-chat`) unlock, and how is that gating implemented?
29. Why is `process-pdf-report` structured with tool-calling while `analyze-medical-report` isn't?
30. What is stored in Supabase Storage, who writes it, and via which key?
31. If Cerebras returned valid text but invalid JSON, what happens next in the code?
32. What's the risk of prompt injection here, and where would it enter?
33. Why is the health score computed on the client instead of in the function?
34. What would you index if you decided to keep per-user history?
35. How would realtime (websockets) change the flow, and what would you remove?
36. Why did migrating to your own Supabase project require consolidating 57 migrations?
37. What exactly is ephemeral about this app, and what is *not*?
38. What does `set_updated_at()` do and when does it fire?
39. Name three vestigial/dead things in the repo and why they're safe to delete.
40. How would you prove the analysis is correct for a given report? What ground truth do you have?
41. What happens on a 20-page PDF on a low-end phone, step by step?
42. Why is the supabase client configured with `persistSession`/`localStorage` if there's no auth?
43. Which routes actually work today, and which are broken? Why?
44. How would you make the scoring "defensible" to a clinician?
45. What's the failure UX on an analysis error, and why is it better than a redirect?
46. Where would you add tests first, and what would they assert?
47. What's the difference between `VITE_SUPABASE_PUBLISHABLE_KEY` and the service-role key?
48. Why is the OCR done server-side but the PDF-to-text/image done client-side?
49. If you had to cut LLM cost in half tomorrow, what two changes would you make?
50. Summarise this project in 30 seconds, then defend the single weakest part of it.
