# DiagAssist RAG — evaluation harness (Stage 3)

Proves what the grounding layer actually buys us, and what it costs. Every golden
report is analysed **twice** — ungrounded (baseline) and grounded with the
retrieved India-first references — and both are scored on the same metrics.

The harness reuses the **same retrieval path** as the edge function
(`retrieval_cache` union + India-first ordering) and the **same model path**
(Cerebras `gemma-4-31b` primary → Gemini `gemini-2.0-flash` fallback), so the
numbers reflect production rather than a proxy.

## Run it

Needs the same secrets the edge function uses. The service-role key is powerful —
keep it local, never commit it, never ship it to the browser.

```bash
export SUPABASE_URL="https://fnkrhjdbjbvradlagegs.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role key for THAT project>"
export CEREBRAS_API_KEY="<primary model key>"   # optional; omit to run on Gemini only
export GEMINI_API_KEY="<fallback + judge key>"  # required

npx tsx scripts/eval.ts             # full run, both conditions, with LLM judge
npx tsx scripts/eval.ts --limit 3   # quick subset while iterating
npx tsx scripts/eval.ts --no-judge  # skip the judge (faster/cheaper; keeps the deterministic metrics)
```

Run `scripts/ingest.ts` first — the harness reads the populated `kb_chunks` /
`retrieval_cache`, so an empty DB shows 0% recall.

## What each metric means

**Grounding quality**
- `retrieval recall@analyte` — of the analytes we *expect* in each report, how many
  did the cache surface a reference for. Measures corpus coverage, model-independent.
- `citation coverage` — share of grounded runs where the model cited ≥1 **valid**
  source id. Low coverage = the model is ignoring the references we handed it.
- `fabricated-citation rate` — share of cited ids that were **not** in the provided
  set. This is the raw hallucinated-citation rate *before* the edge function strips
  fabricated ids; we want it at or near 0%.

**Hallucination (LLM-judge, lower is better)**
- A Gemini fact-checker counts factual claims per explanation and how many are
  incorrect or unsupported. We report `unsupported/claims` for both conditions and
  the absolute reduction grounding produces. Judge scores are model-assigned, so
  treat them as a directional signal across a batch, not a per-claim ground truth.

**Cost (per report, mean)**
- `tokens` and `USD`, ungrounded → grounded, plus the grounding overhead %. Tokens
  are measured from the API `usage`; USD comes from an explicit rate table.

## Cost rates — set them to reality

The USD figures use a **placeholder** rate table (see `PRICES` in `scripts/eval.ts`).
Override without editing code:

```bash
export PRICE_CEREBRAS_IN=0.10 PRICE_CEREBRAS_OUT=0.10   # USD per 1M tokens
export PRICE_GEMINI_IN=0.10   PRICE_GEMINI_OUT=0.40
```

Confirm the current published rates for your plan before quoting the dollar numbers
anywhere. Token counts are exact regardless; only the USD conversion depends on these.

## Output

- Console: a before/after summary table.
- `eval/results/<timestamp>.json` — full per-report data (recall, citations, tokens,
  cost, judge counts) for each run.
- `eval/results/latest.md` — the latest summary as a table, handy to drop into a
  README or a resume bullet.

## The golden set

`eval/golden.jsonl` — 9 synthetic India-format lab reports across the core panels
(diabetes, lipids, anaemia, vitamins, thyroid hi/lo, kidney, liver, CBC). Each line:
`{ id, report, expectedAnalytes, mustSupport }`. Reports are fabricated (no real
patients). Add lines to broaden coverage, then re-run.
