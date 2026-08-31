/**
 * DiagAssist RAG — evaluation harness (Stage 3).
 *
 * Quantifies what grounding buys us on the abnormal-finding explanations, by
 * running every golden report through the model TWICE — once ungrounded
 * (baseline) and once grounded with the retrieved India-first references — and
 * scoring both:
 *
 *   1. Retrieval recall@analyte   — of the analytes we expect in each report,
 *                                   how many did the cache actually surface a
 *                                   reference for. (Deterministic, DB only.)
 *   2. Citation coverage          — share of grounded runs that cited >=1 valid
 *                                   source id.
 *   3. Fabricated-citation rate   — share of cited ids that were NOT in the
 *                                   provided set (raw hallucinated-citation rate,
 *                                   before the edge function strips them).
 *   4. Tokens / report            — prompt + completion tokens, grounded vs not.
 *   5. API cost / report          — from an explicit, editable rate table.
 *   6. Faithfulness (LLM-judge)   — unsupported/dubious medical claims per
 *                                   explanation, grounded vs not. Lower = better.
 *
 * It reuses the SAME retrieval path as the edge function (retrieval_cache union
 * + India-first ordering) and the SAME model path (Cerebras gemma-4-31b primary,
 * Gemini 2.0 Flash fallback), so the numbers reflect production, not a proxy.
 *
 * Run locally (never in the browser — uses the service-role key):
 *   export SUPABASE_URL=...   SUPABASE_SERVICE_ROLE_KEY=...
 *   export CEREBRAS_API_KEY=...        # primary model (optional; falls back to Gemini)
 *   export GEMINI_API_KEY=...          # fallback model + judge (required)
 *   npx tsx scripts/eval.ts            # full run, both conditions, with judge
 *   npx tsx scripts/eval.ts --limit 3  # quick subset
 *   npx tsx scripts/eval.ts --no-judge # skip the LLM-judge (cheaper/faster)
 *
 * Writes eval/results/<timestamp>.json and refreshes eval/results/latest.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const argLimit = (() => {
  const i = process.argv.indexOf('--limit');
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();
const NO_JUDGE = process.argv.includes('--no-judge');

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---- pricing (USD per 1,000,000 tokens). APPROXIMATE — override with env or edit. ----
const num = (v: string | undefined, d: number) => (v && !isNaN(+v) ? +v : d);
const PRICES: Record<string, { in: number; out: number }> = {
  'gemma-4-31b':      { in: num(process.env.PRICE_CEREBRAS_IN, 0.10), out: num(process.env.PRICE_CEREBRAS_OUT, 0.10) },
  [GEMINI_MODEL]: { in: num(process.env.PRICE_GEMINI_IN, 0.10), out: num(process.env.PRICE_GEMINI_OUT, 0.40) },
};
const costUSD = (model: string, pt: number, ct: number) => {
  const p = PRICES[model] || { in: 0, out: 0 };
  return (pt / 1e6) * p.in + (ct / 1e6) * p.out;
};

// ---- analyte detection: identical to the edge function ----
const ANALYTE_MATCHERS: { key: string; re: RegExp }[] = [
  { key: 'hba1c', re: /hba1c|glycated|glycosylated|\ba1c\b/i },
  { key: 'glucose', re: /glucose|fasting sugar|\bfbs\b|\bfpg\b|blood sugar/i },
  { key: 'ldl', re: /\bldl\b/i },
  { key: 'hdl', re: /\bhdl\b/i },
  { key: 'triglycerides', re: /triglyceride/i },
  { key: 'total cholesterol', re: /total cholesterol/i },
  { key: 'hemoglobin', re: /h(a)?emoglobin|\bhb\b/i },
  { key: 'ferritin', re: /ferritin/i },
  { key: 'vitamin d', re: /vitamin\s*d|25[-\s]?oh|25[-\s]?hydroxy/i },
  { key: 'vitamin b12', re: /\bb12\b|cobalamin/i },
  { key: 'tsh', re: /\btsh\b|thyroid[-\s]?stimulating/i },
  { key: 'creatinine', re: /creatinine/i },
  { key: 'egfr', re: /egfr|\bgfr\b/i },
  { key: 'uric acid', re: /uric acid/i },
  { key: 'alt', re: /\balt\b|\bsgpt\b/i },
  { key: 'ast', re: /\bast\b|\bsgot\b/i },
  { key: 'bilirubin', re: /bilirubin/i },
  { key: 'wbc', re: /\bwbc\b|white blood|leukocyte|leucocyte/i },
  { key: 'platelets', re: /platelet/i },
];

// ---- grounding: identical retrieval path to the edge function ----
async function gatherGrounding(reportText: string): Promise<{ block: string; sources: any[]; matched: string[] }> {
  const lower = (reportText || '').toLowerCase();
  const matched = ANALYTE_MATCHERS.filter((m) => m.re.test(lower)).map((m) => m.key);
  if (matched.length === 0) return { block: '', sources: [], matched };

  const { data: cacheRows } = await supabase.from('retrieval_cache').select('key,chunk_ids');
  const idSet = new Set<number>();
  for (const row of cacheRows || []) {
    const analyte = String(row.key).split(':')[0];
    if (matched.includes(analyte)) (row.chunk_ids || []).forEach((id: number) => idSet.add(id));
  }
  if (idSet.size === 0) return { block: '', sources: [], matched };

  const ids = Array.from(idSet).slice(0, 14);
  const { data: chunks } = await supabase
    .from('kb_chunks').select('id,content,source,source_tier,title,url').in('id', ids);
  if (!chunks || chunks.length === 0) return { block: '', sources: [], matched };

  chunks.sort((a: any, b: any) => (a.source_tier || 9) - (b.source_tier || 9));
  const block = chunks.map((c: any, i: number) => `[S${i + 1}] (${c.source}) ${c.content}`).join('\n');
  const sources = chunks.map((c: any, i: number) => ({
    id: `S${i + 1}`, source: c.source, tier: c.source_tier, title: c.title, url: c.url,
  }));
  return { block, sources, matched };
}

// which analytes does the cache actually have a key for? (retrieval recall denominator helper)
async function cacheAnalytes(): Promise<Set<string>> {
  const { data } = await supabase.from('retrieval_cache').select('key');
  return new Set((data || []).map((r: any) => String(r.key).split(':')[0]));
}

// ---- model path: identical to the edge function (Cerebras primary -> Gemini fallback) ----
type LLMOut = { text: string; model: string; promptTokens: number; completionTokens: number };

async function callLLM(messages: any[], maxTokens: number): Promise<LLMOut> {
  const body: any = { model: 'gemma-4-31b', messages, max_completion_tokens: maxTokens, temperature: 0.2 };
  if (CEREBRAS_API_KEY) {
    try {
      const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const d = await r.json();
        return {
          text: d.choices?.[0]?.message?.content ?? '',
          model: 'gemma-4-31b',
          promptTokens: d.usage?.prompt_tokens ?? 0,
          completionTokens: d.usage?.completion_tokens ?? 0,
        };
      }
      console.warn(`  Cerebras ${r.status}, falling back to Gemini`);
    } catch (e) {
      console.warn('  Cerebras error, falling back to Gemini:', (e as Error).message);
    }
  }
  const gBody = { model: GEMINI_MODEL, messages, max_tokens: maxTokens, temperature: 0.2 };
  const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(gBody),
  });
  if (!gr.ok) throw new Error(`Gemini failed ${gr.status}: ${await gr.text()}`);
  const d = await gr.json();
  return {
    text: d.choices?.[0]?.message?.content ?? '',
    model: GEMINI_MODEL,
    promptTokens: d.usage?.prompt_tokens ?? 0,
    completionTokens: d.usage?.completion_tokens ?? 0,
  };
}

function extractJSON(text: string): any {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch { return null; }
}

// ---- prompts ----
const EXPLAIN_SYS =
  'You explain abnormal lab findings to patients in India in plain, simple language. ' +
  'For each abnormal test in the report, give a short plain-language meaning and practical, ' +
  'India-appropriate diet & lifestyle advice. Output STRICT JSON only, no prose around it: ' +
  '{"findings":[{"analyte":"","meaning":"","advice":""}],"citedSourceIds":[]}. ' +
  'Keep patient-facing text plain — never put [S#] markers inside meaning/advice.';

function groundedSuffix(block: string): string {
  return (
    '\n\nGROUNDING REFERENCES (use ONLY these to ground medical facts):\n' + block +
    '\n\nRules: rely on the references above for medical facts; in "citedSourceIds" list the ' +
    '[S#] ids you actually relied on; never cite an id that is not listed above.'
  );
}

async function explain(report: string, block?: string): Promise<{ out: LLMOut; parsed: any }> {
  const user = `LAB REPORT:\n${report}${block ? groundedSuffix(block) : '\n\n(No external references provided.)'}`;
  const out = await callLLM(
    [{ role: 'system', content: EXPLAIN_SYS }, { role: 'user', content: user }],
    900,
  );
  return { out, parsed: extractJSON(out.text) };
}

// ---- LLM judge (Gemini, temperature 0) ----
async function judge(explanationJSON: any, block?: string): Promise<{ claims: number; unsupported: number }> {
  if (NO_JUDGE || !explanationJSON) return { claims: 0, unsupported: 0 };
  const findings = (explanationJSON.findings || [])
    .map((f: any) => `- ${f.analyte}: ${f.meaning} ADVICE: ${f.advice}`).join('\n');
  const refs = block ? `\n\nThe explanation was supposed to rely on these references:\n${block}` : '';
  const sys =
    'You are a careful medical fact-checker. Count the distinct factual medical claims in the ' +
    'explanation, and how many are medically INCORRECT or NOT supported' +
    (block ? ' by the provided references (and not standard, well-established medical fact)' : ' by standard, well-established medical fact') +
    '. Output STRICT JSON only: {"claims":N,"unsupported":M}.';
  const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMINI_MODEL, temperature: 0, max_tokens: 200,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: `EXPLANATION:\n${findings}${refs}` }],
    }),
  });
  if (!gr.ok) return { claims: 0, unsupported: 0 };
  const d = await gr.json();
  const j = extractJSON(d.choices?.[0]?.message?.content ?? '');
  return { claims: Math.max(0, +j?.claims || 0), unsupported: Math.max(0, +j?.unsupported || 0) };
}

type Row = {
  id: string; matched: string[]; expected: string[]; recall: number;
  validCited: number; fabricated: number; totalCited: number;
  ungrounded: { tokens: number; cost: number; claims: number; unsupported: number };
  grounded: { tokens: number; cost: number; claims: number; unsupported: number };
};

async function main() {
  const path = resolve(process.cwd(), 'eval/golden.jsonl');
  const golden = readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => JSON.parse(l)).slice(0, argLimit);
  console.log(`Loaded ${golden.length} golden reports`);
  console.log(`Rate table (USD / 1M tok): ${JSON.stringify(PRICES)}  [approximate — override with PRICE_* env]`);
  console.log(NO_JUDGE ? 'Judge: OFF (--no-judge)' : `Judge: ON (${GEMINI_MODEL})`);

  const haveCache = await cacheAnalytes();
  const rows: Row[] = [];

  for (const g of golden) {
    process.stdout.write(`\n[${g.id}] `);
    const grounding = await gatherGrounding(g.report);
    const sourceIds = new Set(grounding.sources.map((s) => s.id));

    // retrieval recall: expected analytes for which the cache has a key AND grounding surfaced sources
    const expected: string[] = g.expectedAnalytes || [];
    const covered = expected.filter((a) => haveCache.has(a) && grounding.matched.includes(a));
    const recall = expected.length ? covered.length / expected.length : 1;

    // baseline (ungrounded) and grounded explanations
    const base = await explain(g.report);              process.stdout.write('u');
    const grnd = await explain(g.report, grounding.block); process.stdout.write('g');

    // citation validity on the grounded run
    const cited: string[] = Array.isArray(grnd.parsed?.citedSourceIds) ? grnd.parsed.citedSourceIds.map(String) : [];
    const validCited = cited.filter((c) => sourceIds.has(c)).length;
    const fabricated = cited.filter((c) => !sourceIds.has(c)).length;

    // faithfulness judge
    const jBase = await judge(base.parsed);                      process.stdout.write('J');
    const jGrnd = await judge(grnd.parsed, grounding.block);     process.stdout.write('J');

    rows.push({
      id: g.id, matched: grounding.matched, expected, recall,
      validCited, fabricated, totalCited: cited.length,
      ungrounded: {
        tokens: base.out.promptTokens + base.out.completionTokens,
        cost: costUSD(base.out.model, base.out.promptTokens, base.out.completionTokens),
        claims: jBase.claims, unsupported: jBase.unsupported,
      },
      grounded: {
        tokens: grnd.out.promptTokens + grnd.out.completionTokens,
        cost: costUSD(grnd.out.model, grnd.out.promptTokens, grnd.out.completionTokens),
        claims: jGrnd.claims, unsupported: jGrnd.unsupported,
      },
    });
  }

  // ---- aggregate ----
  const n = rows.length;
  const mean = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / (n || 1);
  const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  const recallMean = mean((r) => r.recall);
  const coverage = rows.filter((r) => r.validCited > 0).length / (n || 1);
  const totalCited = sum((r) => r.totalCited);
  const fabricatedRate = totalCited ? sum((r) => r.fabricated) / totalCited : 0;
  const tokU = mean((r) => r.ungrounded.tokens), tokG = mean((r) => r.grounded.tokens);
  const costU = mean((r) => r.ungrounded.cost), costG = mean((r) => r.grounded.cost);
  const claimsU = sum((r) => r.ungrounded.claims), unsU = sum((r) => r.ungrounded.unsupported);
  const claimsG = sum((r) => r.grounded.claims), unsG = sum((r) => r.grounded.unsupported);
  const hallU = claimsU ? unsU / claimsU : 0;
  const hallG = claimsG ? unsG / claimsG : 0;

  const lines: string[] = [];
  const P = (s: string) => { lines.push(s); console.log(s); };
  P('\n\n=========== DiagAssist RAG — evaluation ===========');
  P(`reports: ${n}`);
  P('');
  P('GROUNDING QUALITY');
  P(`  retrieval recall@analyte (mean) : ${pct(recallMean)}`);
  P(`  citation coverage (runs cited>=1): ${pct(coverage)}`);
  P(`  fabricated-citation rate         : ${pct(fabricatedRate)}  (${sum((r) => r.fabricated)}/${totalCited} ids)`);
  P('');
  P('HALLUCINATION (LLM-judge, lower is better)');
  P(`  ungrounded unsupported/claims : ${unsU}/${claimsU}  = ${pct(hallU)}`);
  P(`  grounded   unsupported/claims : ${unsG}/${claimsG}  = ${pct(hallG)}`);
  P(`  absolute reduction            : ${pct(hallU - hallG)}`);
  P('');
  P('COST (per report, mean)');
  P(`  tokens  ungrounded -> grounded : ${tokU.toFixed(0)} -> ${tokG.toFixed(0)}  (+${(tokG - tokU).toFixed(0)})`);
  P(`  USD     ungrounded -> grounded : $${costU.toFixed(6)} -> $${costG.toFixed(6)}  (+$${(costG - costU).toFixed(6)})`);
  P(`  grounding overhead             : ${tokU ? pct((tokG - tokU) / tokU) : 'n/a'} more tokens/report`);
  P('===================================================');

  // ---- persist ----
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summary = {
    when: new Date().toISOString(), reports: n, judge: !NO_JUDGE, prices: PRICES,
    grounding: { retrievalRecall: recallMean, citationCoverage: coverage, fabricatedCitationRate: fabricatedRate },
    hallucination: { ungrounded: hallU, grounded: hallG, reduction: hallU - hallG, claimsU, unsU, claimsG, unsG },
    cost: { tokensUngrounded: tokU, tokensGrounded: tokG, usdUngrounded: costU, usdGrounded: costG },
    rows,
  };
  writeFileSync(resolve(process.cwd(), `eval/results/${stamp}.json`), JSON.stringify(summary, null, 2));

  const md = [
    `# DiagAssist RAG — eval results`, ``,
    `_${summary.when} · ${n} reports · judge ${NO_JUDGE ? 'off' : 'on'}_`, ``,
    `| metric | value |`, `| --- | --- |`,
    `| retrieval recall@analyte (mean) | ${pct(recallMean)} |`,
    `| citation coverage | ${pct(coverage)} |`,
    `| fabricated-citation rate | ${pct(fabricatedRate)} |`,
    `| hallucination — ungrounded | ${pct(hallU)} |`,
    `| hallucination — grounded | ${pct(hallG)} |`,
    `| **hallucination reduction** | **${pct(hallU - hallG)}** |`,
    `| tokens/report — ungrounded → grounded | ${tokU.toFixed(0)} → ${tokG.toFixed(0)} |`,
    `| cost/report — ungrounded → grounded | $${costU.toFixed(6)} → $${costG.toFixed(6)} |`, ``,
    `Rates used (USD/1M tok, approximate — edit in eval or via PRICE_* env): \`${JSON.stringify(PRICES)}\``, ``,
    `Raw per-report data: \`eval/results/${stamp}.json\``, ``,
  ].join('\n');
  writeFileSync(resolve(process.cwd(), 'eval/results/latest.md'), md);
  console.log(`\nWrote eval/results/${stamp}.json and eval/results/latest.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
