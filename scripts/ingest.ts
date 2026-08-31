/**
 * DiagAssist RAG — corpus ingestion + retrieval precompute.
 *
 * Reads corpus/analytes.jsonl, embeds each chunk with Google
 * gemini-embedding-001 at 768 dims (reusing GEMINI_API_KEY), upserts them into `kb_chunks`,
 * then PRECOMPUTES the top-k retrieval for every known (analyte, direction)
 * key into `retrieval_cache` — so the online path is a lookup, not a live
 * vector search.
 *
 * Run (from the repo root):
 *   export SUPABASE_URL=...            # your project URL
 *   export SUPABASE_SERVICE_ROLE_KEY=... # service-role key (server-side only!)
 *   export GEMINI_API_KEY=...          # same key the edge functions use
 *   npx tsx scripts/ingest.ts          # ingest + precompute
 *   npx tsx scripts/ingest.ts --sanity # + print a few sample retrievals
 *
 * This talks to your live database with the service-role key, so run it
 * locally, never in the browser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SANITY = process.argv.includes('--sanity');

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY are all required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Current Google embedding model. Override with EMBED_MODEL if your key exposes a
// different one (e.g. text-embedding-004). Must produce EMBED_DIM dimensions.
const EMBED_MODEL = process.env.EMBED_MODEL || 'gemini-embedding-001';
const EMBED_DIM = 768; // must match the vector(768) column in the kb_rag migration
const EMBED_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

type Chunk = {
  content: string;
  analyte_tags: string[];
  source: string;
  source_tier: number;
  region: string;
  title: string;
  url: string;
  guideline: string;
};

// Known (analyte, direction) keys we precompute retrieval for.
const ANALYTES: { analyte: string; directions: string[] }[] = [
  { analyte: 'hba1c', directions: ['high'] },
  { analyte: 'glucose', directions: ['high', 'low'] },
  { analyte: 'ldl', directions: ['high'] },
  { analyte: 'hdl', directions: ['low'] },
  { analyte: 'triglycerides', directions: ['high'] },
  { analyte: 'total cholesterol', directions: ['high'] },
  { analyte: 'hemoglobin', directions: ['low'] },
  { analyte: 'ferritin', directions: ['low'] },
  { analyte: 'vitamin d', directions: ['low'] },
  { analyte: 'vitamin b12', directions: ['low'] },
  { analyte: 'tsh', directions: ['high', 'low'] },
  { analyte: 'creatinine', directions: ['high'] },
  { analyte: 'egfr', directions: ['low'] },
  { analyte: 'uric acid', directions: ['high'] },
  { analyte: 'alt', directions: ['high'] },
  { analyte: 'ast', directions: ['high'] },
  { analyte: 'bilirubin', directions: ['high'] },
  { analyte: 'wbc', directions: ['high', 'low'] },
  { analyte: 'platelets', directions: ['low', 'high'] },
];

const TOP_K = 3; // compact context: ~2 threshold/implication chunks + 1 plain-language

async function embed(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, taskType, outputDimensionality: EMBED_DIM }),
  });
  if (!res.ok) throw new Error(`Embedding failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error('Embedding response missing values');
  if (values.length !== EMBED_DIM) {
    throw new Error(`Expected ${EMBED_DIM} dims but got ${values.length}. Set EMBED_DIM / the vector() column to match.`);
  }
  return values;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const RELEVANCE_FLOOR = 0.30;      // don't ground on clearly-irrelevant chunks
const tierBoost = (t: number) => (t === 1 ? 0.06 : t === 2 ? 0.03 : t === 3 ? 0.02 : 0); // India-first preference

async function main() {
  // 1) load corpus
  const path = resolve(process.cwd(), 'corpus/analytes.jsonl');
  const lines = readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const chunks: Chunk[] = lines.map((l) => JSON.parse(l));
  console.log(`Loaded ${chunks.length} chunks from corpus/analytes.jsonl`);

  // 2) embed each chunk (sequential to stay well under rate limits)
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    embeddings.push(await embed(chunks[i].content));
    if ((i + 1) % 10 === 0) console.log(`  embedded ${i + 1}/${chunks.length}`);
  }
  console.log(`Embedded ${embeddings.length} chunks (dim ${embeddings[0]?.length})`);

  // 3) rebuild kb_chunks (idempotent full refresh)
  await supabase.from('retrieval_cache').delete().neq('key', '');
  await supabase.from('kb_chunks').delete().neq('id', -1);

  const rows = chunks.map((c, i) => ({
    content: c.content,
    embedding: `[${embeddings[i].join(',')}]`, // pgvector text input
    source: c.source,
    source_tier: c.source_tier,
    region: c.region,
    title: c.title,
    url: c.url,
    guideline: c.guideline,
    analyte_tags: c.analyte_tags,
  }));

  // insert in batches, keeping the DB id so we can build the cache
  const inserted: { id: number; idx: number }[] = [];
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { data, error } = await supabase.from('kb_chunks').insert(slice).select('id');
    if (error) throw new Error(`Insert failed: ${error.message}`);
    (data || []).forEach((r: any, j: number) => inserted.push({ id: r.id, idx: i + j }));
  }
  console.log(`Inserted ${inserted.length} kb_chunks`);

  // 4) precompute retrieval_cache for each known (analyte, direction)
  const cacheRows: { key: string; chunk_ids: number[] }[] = [];
  for (const { analyte, directions } of ANALYTES) {
    for (const dir of directions) {
      const q = `${analyte} ${dir}: what it means, health implications, and Indian dietary and lifestyle advice`;
      const qEmb = await embed(q, 'RETRIEVAL_QUERY');

      // candidate chunks: those tagged for this analyte (+ general lifestyle chunks)
      const scored = chunks
        .map((c, i) => {
          const tagged = c.analyte_tags.includes(analyte) || (c.analyte_tags.includes('general') && dir !== 'low');
          const sim = cosine(qEmb, embeddings[i]);
          const dirMatch = c.analyte_tags.includes(dir) ? 0.03 : 0;
          const score = sim + tierBoost(c.source_tier) + (tagged ? 0.05 : 0) + dirMatch;
          return { i, id: inserted.find((x) => x.idx === i)!.id, sim, score, tier: c.source_tier, tagged };
        })
        .filter((x) => x.tagged && x.sim >= RELEVANCE_FLOOR)
        .sort((a, b) => b.score - a.score);

      // take top-k, but ensure one plain-language (tier 3) 'what it is' chunk is present
      const picked = scored.slice(0, TOP_K);
      if (!picked.some((p) => p.tier === 3)) {
        const t3 = scored.find((p) => p.tier === 3);
        if (t3) { picked.pop(); picked.push(t3); }
      }

      const key = `${analyte}:${dir}`;
      cacheRows.push({ key, chunk_ids: picked.map((p) => p.id) });
      if (SANITY) {
        console.log(`\n[${key}] ->`);
        picked.forEach((p) => console.log(`   (tier ${p.tier}, sim ${p.sim.toFixed(2)}) ${chunks[p.i].content.slice(0, 90)}...`));
      }
    }
  }

  const { error: cacheErr } = await supabase.from('retrieval_cache').insert(cacheRows);
  if (cacheErr) throw new Error(`retrieval_cache insert failed: ${cacheErr.message}`);
  console.log(`\nPrecomputed ${cacheRows.length} retrieval_cache keys`);
  console.log('Done. kb_chunks + retrieval_cache are ready for the edge function (Stage 2).');
}

main().catch((e) => { console.error(e); process.exit(1); });
