# DiagAssist — handoff & deployment guide

For whoever is deploying/hosting this project. It has two halves that deploy
separately:

1. **Frontend** — a static React/Vite site (build it, host the `dist/` folder anywhere).
2. **Backend** — a Supabase project (PostgreSQL + Deno Edge Functions + Storage).

> ⚠️ **Most common mistake first:** the frontend needs two build-time environment
> variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). **Without them the
> deployed site is a blank white screen** (it throws `supabaseUrl is required`). Set them
> before/while building — see §2 and §5.

---

## 1. Prerequisites

- **Node.js 20+** and npm.
- **Supabase CLI** (for the backend): https://supabase.com/docs/guides/cli
- The **secrets** listed in §2 — these are NOT in this zip. Get them from Zayed (or the
  Supabase / provider dashboards).

## 2. Secrets & environment variables (not included in the zip)

**Frontend (build-time, prefixed `VITE_`)** — put these in a `.env` file (copy `.env.example`):

| Variable | Required | What it is |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | `https://<project-ref>.supabase.co` (project ref is `fnkrhjdbjbvradlagegs`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase **anon/publishable** key (Dashboard → Project Settings → API). Public/safe. |
| `VITE_SUPABASE_PROJECT_ID` | optional | the project ref string |
| `VITE_VAPID_PUBLIC_KEY` | optional | only for web-push notifications |

**Backend (Supabase Edge Function secrets)** — set with `supabase secrets set NAME=value`:

| Secret | Required | Powers |
| --- | --- | --- |
| `CEREBRAS_API_KEY` | ✅ | primary AI (OCR + analysis + chat) |
| `GEMINI_API_KEY` | ✅ | automatic fallback AI |
| `GEMINI_MODEL` | optional | override the Gemini model (defaults to `gemini-3.6-flash`) |
| `TWILIO_*` (SID, AUTH_TOKEN, PHONE_NUMBER, VERIFY_SERVICE_SID) | optional | phone OTP / SMS |
| `DAILY_API_KEY` | optional | video consultation rooms |
| `GOOGLE_SERVICE_ACCOUNT_*`, `GOOGLE_DRIVE_FOLDER_ID` | optional | export-to-Drive |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase
automatically — you do **not** set those yourself. **Never commit real secrets to git.**

## 3. Run locally

```bash
npm install
cp .env.example .env         # then fill in VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:8080
```

## 4. Build for production

```bash
npm run build                # outputs static files to dist/
npm run preview              # optional: serve dist/ locally to check it
```

## 5. Deploy the frontend (static hosting)

`dist/` is a plain static site — host it on Vercel, Netlify, Cloudflare Pages, or any
static server. Two must-dos:

1. **Set the `VITE_` env vars in the host's build settings** (same as §2), or the site
   builds blank.
2. **Enable SPA fallback** — rewrite all unknown paths to `/index.html`, otherwise deep
   links like `/models` or `/my-reports` 404 on refresh.
   - Netlify: add `public/_redirects` with `/*  /index.html  200`
   - Vercel: add `vercel.json` with a rewrite of `/(.*)` → `/index.html`

## 6. Deploy the backend (Supabase)

```bash
supabase link --project-ref fnkrhjdbjbvradlagegs   # or your own new project ref
supabase db push                                   # applies migrations (incl. pgvector for RAG)
supabase secrets set CEREBRAS_API_KEY=... GEMINI_API_KEY=...
# deploy the core functions (there are more under supabase/functions/ for optional features):
supabase functions deploy analyze-medical-report --no-verify-jwt
supabase functions deploy process-pdf-report --no-verify-jwt
supabase functions deploy clinical-triage-chat --no-verify-jwt
supabase functions deploy get-analysis-result --no-verify-jwt
supabase functions deploy voiceflow-chat --no-verify-jwt
```

If `db push` reports the `vector` extension is blocked, enable **Vector** once in the
dashboard (Database → Extensions), then re-run.

## 7. (Optional) RAG grounding data

The India-first source grounding needs its knowledge base populated once:

```bash
export SUPABASE_URL="https://fnkrhjdbjbvradlagegs.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role key for THAT project>"
export GEMINI_API_KEY="<same key the functions use>"
npx tsx scripts/ingest.ts --sanity
```

See `scripts/README.md` for details. Keep the service-role key local — never ship it.

## 8. Troubleshooting

- **Blank white page in production** → the `VITE_SUPABASE_*` env vars weren't set at build
  time. Set them in the host and rebuild. (This is the #1 issue.)
- **Deep links 404 on refresh** → SPA fallback not configured (see §5).
- **Analysis fails / falls back constantly** → check `CEREBRAS_API_KEY`; the Gemini fallback
  uses `gemini-3.6-flash` — redeploy the functions after any model change.
- **Large-bundle warning during build** → cosmetic; the build still succeeds.

## 9. Repo map

- `src/` — React frontend. `src/pages/`, `src/components/`. `src/ml/` = exported ML model
  weights; `src/lib/riskModel.ts` = in-browser inference; `/models` route = model explorer.
- `supabase/functions/` — Deno edge functions (the API). `supabase/migrations/` — DB schema.
- `corpus/`, `scripts/` — RAG knowledge base + ingestion/eval tooling.
- `ml/` — model training (`train.py`), reports, charts, `MODEL_CARD.md`, study page.
- `README.md` — full architecture overview.

Verified: this exact version passes a clean `npm install && npm run build` and the app
renders and runs (landing + interactive `/models`) in a headless browser.
