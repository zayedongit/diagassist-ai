# DiagAssist RAG — Stage 0 & Stage 1 runbook

This sets up the India-first knowledge base that grounds abnormal-finding
explanations. Run these once (and again whenever you change `corpus/analytes.jsonl`).

## Stage 0 — apply the schema

Applies the pgvector migration (`kb_chunks`, `retrieval_cache`, `match_kb_chunks`).

```bash
supabase db push
```

If `create extension vector` is blocked on your plan, enable **Vector** once in
the Supabase dashboard (Database → Extensions), then re-run `supabase db push`.

## Stage 1 — ingest the corpus + precompute retrieval

Requires three env vars. The service-role key is powerful — keep it local, never
commit it, never ship it to the browser.

```bash
export SUPABASE_URL="https://<your-project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export GEMINI_API_KEY="<same key your edge functions use>"

# ingest + precompute
npx tsx scripts/ingest.ts

# same, but also print a few sample retrievals so you can eyeball quality
npx tsx scripts/ingest.ts --sanity
```

What it does:
1. Reads `corpus/analytes.jsonl`.
2. Embeds each chunk with Google `gemini-embedding-001` (768-dim) using your Gemini key.
3. Rebuilds `kb_chunks` (full idempotent refresh).
4. Precomputes `retrieval_cache` — the top chunks for every known
   `(analyte, direction)` key — so the live analysis path is a lookup, not a
   vector search.

## Sanity check

`--sanity` prints, per key, the chosen chunks with their tier and cosine
similarity. You want to see India-tier (ICMR/NIN) chunks surfacing for things
like `hba1c:high`, `ldl:high`, `vitamin d:low`, alongside a plain-language
MedlinePlus "what it is" chunk. If a key returns nothing, its analyte probably
needs more/better-tagged chunks in the corpus.

## Notes

- **Licensing:** the corpus is public-domain (MedlinePlus) or our own
  paraphrased summaries citing ICMR / NIN / WHO / ADA — never verbatim
  copyrighted guideline text. Keep it that way when you expand it.
- **Verify citations:** the `url` fields point at reliable domains; confirm the
  exact deep links before showing them to users.
- Expanding the corpus = add lines to `analytes.jsonl` (and, for a brand-new
  analyte, a row in the `ANALYTES` list in `ingest.ts`), then re-run ingest.
