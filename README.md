# Diagassist AI

AI-powered medical report analysis. Upload a lab or diagnostic report and get clear,
easy-to-understand insights — health scores, risk predictions, flagged abnormal values,
downloadable PDF reports, and an AI assistant for follow-up questions.

## Tech stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** OpenAI (GPT-4o / GPT-4o-mini)

## Running locally

Requires Node.js and npm.

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:8080
```

Copy `.env.example` to `.env` and fill in your Supabase project values:

```
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
```

## Project structure

- `src/pages` — top-level screens
- `src/components` — UI components
- `src/utils` — analysis, scoring, and PDF-generation logic
- `supabase/functions` — backend edge functions (AI analysis, auth, notifications)
- `supabase/migrations` — database schema
