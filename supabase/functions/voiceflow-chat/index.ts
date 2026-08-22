import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report-grounded chat that helps a patient understand THEIR OWN report in the
// simplest everyday language. Powered by Cerebras with a Google Gemini fallback.
// Request  { message, sessionId, analysisContext?, isInitialization?, history? }
//   history: optional [{ role: 'user' | 'assistant', content: string }, ...]
// Response { response, options, sessionId }
//   options: up to 4 short suggested follow-up questions the user can tap.
async function chatComplete(messages: any[], wantJson: boolean): Promise<string> {
  const cerebrasKey = Deno.env.get('CEREBRAS_API_KEY');
  const baseBody: any = {
    model: 'gemma-4-31b',
    messages,
    temperature: 0.4,
    max_completion_tokens: 700,
  };

  // Primary: Cerebras
  try {
    if (!cerebrasKey) throw new Error('Cerebras API key not configured');
    const resp = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cerebrasKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(baseBody),
    });
    if (!resp.ok) throw new Error(`Cerebras error ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (cerebrasErr) {
    // Fallback: Google Gemini (OpenAI-compatible endpoint)
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw cerebrasErr;
    console.warn('voiceflow-chat: Cerebras failed, falling back to Gemini —', (cerebrasErr as Error).message);
    const gBody: any = { ...baseBody, model: 'gemini-2.0-flash', max_tokens: baseBody.max_completion_tokens };
    delete gBody.max_completion_tokens;
    if (wantJson) gBody.response_format = { type: 'json_object' };
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(gBody),
    });
    if (!resp.ok) throw new Error(`Gemini error ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }
}

// Pull a JSON object out of whatever the model returned (it may wrap it in prose or fences).
function parseReply(raw: string): { reply: string; options: string[] } {
  if (!raw) return { reply: '', options: [] };
  let text = raw.trim();
  // strip code fences
  text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      const obj = JSON.parse(slice);
      const reply = typeof obj.reply === 'string' ? obj.reply.trim() : '';
      const options = Array.isArray(obj.options)
        ? obj.options.filter((o: any) => typeof o === 'string' && o.trim()).slice(0, 4).map((o: string) => o.trim())
        : [];
      if (reply) return { reply, options };
    } catch (_) {
      // fall through to plain-text handling
    }
  }
  // No parseable JSON — treat the whole thing as the reply.
  return { reply: text, options: [] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, analysisContext, isInitialization, history } = await req.json();

    const system =
      `You are a warm, patient guide helping someone understand THEIR OWN medical lab report. ` +
      `The person has no medical background at all.\n` +
      `How to talk:\n` +
      `- Use the SIMPLEST possible everyday words, as if explaining to a friend or a child. Short sentences.\n` +
      `- Avoid medical jargon. If a medical word is truly needed, immediately say what it means in plain words (for example: "your platelets, the tiny cells that help blood clot").\n` +
      `- Use simple comparisons or examples when they help understanding.\n` +
      `- Be warm and reassuring, but honest about anything that matters.\n` +
      `- Keep each answer short: about 2 to 4 short sentences.\n` +
      `- Talk only about THIS person's report and health information directly related to it. If asked something unrelated, gently guide them back.\n` +
      `- Never give a diagnosis and never name specific medicines to take.\n` +
      `- Do NOT end your messages with reminders like "talk to your doctor" or "consult a professional". A separate disclaimer is already shown to the person. Only mention a doctor when a specific finding genuinely needs it, and keep it to a few words — never as a routine sign-off.\n` +
      `- Do not use emojis or symbols.\n\n` +
      `ALWAYS respond with ONLY a JSON object in this exact shape, and nothing else:\n` +
      `{"reply": "your answer in plain, simple language", "options": ["short follow-up 1", "short follow-up 2", "short follow-up 3"]}\n` +
      `"options" are 2 to 4 very short suggested next questions the person might want to tap (each under 6 words, phrased as the person would ask them). If nothing fits, use an empty array.` +
      (analysisContext ? `\n\nThis person's report and results (use as the source of truth):\n${analysisContext}` : '');

    const priorTurns = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-10)
          .map((m: any) => ({ role: m.role, content: m.content }))
      : [];

    const userContent = isInitialization
      ? "Greet me in one friendly sentence, tell me you've read my report, and invite me to ask anything about it. Then give options like simple things I could ask about my report."
      : (message && message.trim())
        ? message.trim()
        : "Greet me and invite me to ask questions about my report.";

    const messages = [
      { role: 'system', content: system },
      ...priorTurns,
      { role: 'user', content: userContent },
    ];

    let raw = '';
    try {
      raw = await chatComplete(messages, true);
    } catch (e) {
      console.error('voiceflow-chat: both providers failed —', (e as Error).message);
    }

    let { reply, options } = parseReply(raw);

    if (!reply) {
      reply = isInitialization
        ? "Hi! I've read through your report and I'm here to explain it in plain, simple words. What would you like to know?"
        : "Sorry, I had a little trouble just now. Could you ask that again in a moment?";
      options = isInitialization
        ? ['What are my main issues?', 'Is anything serious?', 'What should I do next?']
        : [];
    }

    return new Response(JSON.stringify({ response: reply, options, sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in voiceflow-chat:', error);
    return new Response(JSON.stringify({
      error: 'technical difficulties',
      response: "I'm having a little trouble right now. Please try again in a moment.",
      options: [],
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
