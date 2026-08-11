#!/usr/bin/env node
// 20-second probe: does gemma-4-31b on Cerebras support OpenAI-style tool calling?
// This decides how we convert your camera engine (process-pdf-report).
//
//   export CEREBRAS_API_KEY=csk-...
//   node tool-probe.mjs
//
const KEY = process.env.CEREBRAS_API_KEY;
if (!KEY) { console.error('\n❌ export CEREBRAS_API_KEY=csk-... first\n'); process.exit(1); }

const body = {
  model: 'gemma-4-31b',
  messages: [{ role: 'user', content: 'What is the weather in Paris? Call the tool to find out.' }],
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather for a city',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    },
  }],
  tool_choice: { type: 'function', function: { name: 'get_weather' } },
  max_completion_tokens: 200,
};

const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const text = await r.text();
console.log(`\nHTTP ${r.status}`);
let j; try { j = JSON.parse(text); } catch { console.log(text.slice(0, 600)); process.exit(0); }

const msg = j.choices?.[0]?.message;
const toolCalls = msg?.tool_calls;

console.log('----------------------------------------');
if (r.ok && toolCalls && toolCalls.length > 0) {
  console.log('✅ TOOL CALLING WORKS on gemma-4-31b.');
  console.log('   Tool called:', toolCalls[0].function?.name, '| args:', toolCalls[0].function?.arguments);
  console.log('   → Camera engine = a simple endpoint/model swap.');
} else if (r.ok) {
  console.log('⚠️  No tool_call returned. Gemma answered in plain text instead:');
  console.log('   ', (msg?.content || '').slice(0, 200));
  console.log('   → Tool calling NOT usable here; camera engine needs the JSON-prompt approach.');
} else {
  console.log('❌ Request rejected (status ' + r.status + '):');
  console.log('   ', (j.error?.message || text).slice(0, 300));
  console.log('   → Likely tool calling is unsupported for this model; use the JSON-prompt approach.');
}
console.log('----------------------------------------\n');
