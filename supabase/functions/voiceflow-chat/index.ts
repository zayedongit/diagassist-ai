import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report-grounded chat that helps a patient understand THEIR OWN report in full
// layman terms. Powered by Cerebras with an automatic Google Gemini fallback.
// Request  { message, sessionId, analysisContext?, isInitialization?, history? }
//   history: optional [{ role: 'user' | 'assistant', content: string }, ...]
// Response { response, sessionId }.
async function chatComplete(messages: any[]): Promise<string> {
  const cerebrasKey = Deno.env.get('CEREBRAS_API_KEY');
  const baseBody = {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, analysisContext, isInitialization, history } = await req.json();

    const system =
      `You are a warm, patient guide helping someone understand THEIR OWN medical lab report. ` +
      `The person has no medical background at all.\n` +
      `How to answer:\n` +
      `- Explain everything in FULL layman terms: simple, everyday words and short sentences, as if talking to a friend who is not a doctor.\n` +
      `- Whenever a medical word is unavoidable, immediately explain it in plain words (for example: "LDL, which is the 'bad' cholesterol").\n` +
      `- Be warm, reassuring, and honest. Do not scare the person, but do not hide real concerns either.\n` +
      `- Keep answers focused and fairly short (about 2 to 5 sentences). Use a simple example when it helps.\n` +
      `- Talk only about this person's report and general health education that directly relates to it. If asked something unrelated, gently guide them back to their report.\n` +
      `- Never give a diagnosis and never prescribe medicine. For any real decision, encourage them to speak with their doctor.\n` +
      `- Do not use emojis or symbols.` +
      (analysisContext ? `\n\nThis person's report analysis (use it as the source of truth):\n${analysisContext}` : '');

    // Build the conversation: system, prior turns (if any), then the new user message.
    const priorTurns = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-10) // keep the last 10 turns for context without overloading the prompt
          .map((m: any) => ({ role: m.role, content: m.content }))
      : [];

    const userContent = isInitialization
      ? "Briefly greet me in one or two friendly sentences, tell me you've read my report, and invite me to ask anything about it in plain language."
      : (message && message.trim())
        ? message.trim()
        : "Greet me and invite me to ask questions about my report.";

    const messages = [
      { role: 'system', content: system },
      ...priorTurns,
      { role: 'user', content: userContent },
    ];

    let botResponse = '';
    try {
      botResponse = await chatComplete(messages);
    } catch (e) {
      console.error('voiceflow-chat: both providers failed —', (e as Error).message);
    }

    if (!botResponse) {
      botResponse = isInitialization
        ? "Hello! I've read through your report and I'm here to help you understand it in plain language. What would you like to know?"
        : "I'm sorry, I had trouble with that just now. Could you ask again in a moment? For anything urgent, please contact a healthcare professional.";
    }

    return new Response(JSON.stringify({ response: botResponse, sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in voiceflow-chat:', error);
    return new Response(JSON.stringify({
      error: 'technical difficulties',
      response: "I'm having a little trouble right now. Please try again in a moment. For urgent concerns, please contact a healthcare professional.",
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
