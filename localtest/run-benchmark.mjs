#!/usr/bin/env node
// Local benchmark for the analyze-medical-report OCR + analysis pipeline.
// Runs the SAME prompts your edge function uses, on a pre-rendered copy of
// your test PDF, so you can measure speed AND check correctness without
// deploying or running Supabase / any database.
//
// Pick a provider by which key you export:
//   export CEREBRAS_API_KEY=csk-...   ->  gemma-4-31b on Cerebras (fast, multimodal)
//   export OPENAI_API_KEY=sk-...      ->  gpt-4o-mini on OpenAI (what you run today)
//
//   node run-benchmark.mjs
//
// Optional overrides:  ANALYSIS_MODEL=llama-3.3-70b  CONCURRENCY=6  BATCH_SIZE=1
//
import { readFileSync } from 'node:fs';

const CB = process.env.CEREBRAS_API_KEY;
const OA = process.env.OPENAI_API_KEY;

let P;
if (CB) {
  P = {
    name: 'Cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    key: CB,
    ocrModel: process.env.OCR_MODEL || 'gemma-4-31b',        // only vision model on Cerebras
    analysisModel: process.env.ANALYSIS_MODEL || 'gemma-4-31b',
    tokenParam: 'max_completion_tokens',
    imagesPerReq: Number(process.env.BATCH_SIZE || 1),        // safest for multimodal
    concurrency: Number(process.env.CONCURRENCY || 6),
    jsonMode: false,                                          // rely on prompt + robust parse
  };
} else if (OA) {
  P = {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    key: OA,
    ocrModel: process.env.OCR_MODEL || 'gpt-4o-mini',
    analysisModel: process.env.ANALYSIS_MODEL || 'gpt-4o-mini',
    tokenParam: 'max_tokens',
    imagesPerReq: Number(process.env.BATCH_SIZE || 4),
    concurrency: Number(process.env.CONCURRENCY || 4),
    jsonMode: true,
  };
} else {
  console.error('\n❌ Export a key first:\n   export CEREBRAS_API_KEY=csk-...   (or)   export OPENAI_API_KEY=sk-...\n');
  process.exit(1);
}

const dir = new URL('.', import.meta.url).pathname;
const { pageCount, images, ocrPrompt, pass1Prompt } = JSON.parse(readFileSync(dir + 'payload.json', 'utf8'));
const visionPrompt = ocrPrompt.replaceAll('${images.length}', String(pageCount));
const sec = (ms) => (ms / 1000).toFixed(1) + 's';

async function call(body, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(P.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${P.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) return r.json();
    const t = await r.text();
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      const wait = 2000 * Math.pow(2, attempt - 1);
      console.log(`   ⏳ ${label}: ${r.status}, retrying in ${Math.round(wait / 1000)}s...`);
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    throw new Error(`${label} failed: ${r.status} ${t.slice(0, 400)}`);
  }
}

async function ocrBatch(start, end) {
  const batch = images.slice(start, end);
  const body = {
    model: P.ocrModel,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `${visionPrompt}\n\nProcess ONLY pages ${start + 1}-${end}. Return plain text, preserve structure.` },
        ...batch.map((url) => ({ type: 'image_url', image_url: { url } })),
      ],
    }],
    [P.tokenParam]: 2048,
  };
  const data = await call(body, `OCR ${start + 1}-${end}`);
  return { start, segment: data.choices?.[0]?.message?.content?.trim?.() ?? '' };
}

async function runOCR() {
  const step = P.imagesPerReq * P.concurrency;
  const segments = [];
  for (let base = 0; base < images.length; base += step) {
    const jobs = [];
    for (let c = 0; c < P.concurrency; c++) {
      const s = base + c * P.imagesPerReq;
      if (s >= images.length) break;
      jobs.push(ocrBatch(s, Math.min(s + P.imagesPerReq, images.length)));
    }
    const res = await Promise.all(jobs);
    for (const r of res.sort((a, b) => a.start - b.start)) segments.push(r.segment);
  }
  return segments.join('\n\n---\n\n');
}

function parseJSON(raw) {
  let s = raw.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b > a) return JSON.parse(s.slice(a, b + 1).replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
  throw new Error('could not parse JSON from analysis output');
}

console.log(`\n📄 ${pageCount}-page report`);
console.log(`🔌 Provider: ${P.name}  |  OCR: ${P.ocrModel}  |  analysis: ${P.analysisModel}`);
console.log(`   (${P.imagesPerReq} image/req, ${P.concurrency} in parallel)\n`);

console.log('⏱️  Reading pages (OCR)...');
let t = Date.now();
const text = await runOCR();
const ocrMs = Date.now() - t;
console.log(`   ${sec(ocrMs)}  (${text.length} chars extracted)\n`);

console.log('🧠 Medical analysis...');
t = Date.now();
const body = {
  model: P.analysisModel,
  messages: [{ role: 'user', content: pass1Prompt.replace('${text}', text) }],
  [P.tokenParam]: 16000,
  temperature: 0.3,
  ...(P.jsonMode ? { response_format: { type: 'json_object' } } : {}),
};
const a = await call(body, 'Analysis');
const anaMs = Date.now() - t;
console.log(`   ${sec(anaMs)}\n`);

let result;
try { result = parseJSON(a.choices[0].message.content); }
catch (e) { console.error('⚠️  ' + e.message); console.log(a.choices[0].message.content.slice(0, 1200)); process.exit(1); }

console.log('================= RESULT =================');
console.log(`Patient : ${result.patientName}  |  age ${result.demographics?.age}  |  ${result.demographics?.gender}`);
console.log(`Status  : ${result.overallStatus}`);
console.log(`Summary : ${(result.summary || '').slice(0, 320)}`);
console.log('\nAbnormal values found:');
let n = 0;
for (const p of result.medicalPanels || []) {
  for (const l of p.abnormalLabs || []) {
    n++;
    console.log(`  • [${p.name}] ${l.name}: ${l.value}${l.unit || ''} (${l.status})  ref ${l.referenceRange || '-'}`);
  }
}
if (!n) console.log('  (none flagged)');
console.log(`\nPanels: ${result.medicalPanels?.length || 0}  |  Specialist: ${result.specialist}`);
console.log('==========================================');
console.log(`\n⏱️  TOTAL: OCR ${sec(ocrMs)} + analysis ${sec(anaMs)} = ${sec(ocrMs + anaMs)}   [${P.name}]`);
console.log('    Sanity-check against the report: HbA1c 6.29% (high), Fasting glucose 112 (high), Iron 66 (normal).\n');
