import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Report-grounded clinical chat, powered by Cerebras (no third-party dependency).
// Contract preserved: request { message, sessionId, analysisContext?, isInitialization? }
// -> response { response, sessionId }.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, analysisContext, isInitialization } = await req.json();
    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    if (!CEREBRAS_API_KEY) throw new Error('Cerebras API key not configured');

    const system =
      `You are a warm, careful clinical assistant helping a patient understand THEIR OWN lab report.\n` +
      `Guidelines:\n` +
      `- Discuss only this patient's report and general, factual health education directly related to it.\n` +
      `- Use plain, reassuring but honest language. Keep answers short (2-4 sentences).\n` +
      `- Never diagnose or prescribe. For decisions, encourage seeing a doctor.\n` +
      `- If a question is unrelated to the report, gently steer back to it.` +
      (analysisContext ? `\n\nThe patient's report analysis (context):\n${analysisContext}` : '');

    const userContent = isInitialization
      ? "Briefly greet the patient, mention you've reviewed their report, and invite them to ask questions about it."
      : (message && message.trim())
        ? message.trim()
        : "Greet the patient and invite questions about their report.";

    const resp = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma-4-31b',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        max_completion_tokens: 700,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error('Cerebras chat error:', resp.status, t);
      throw new Error(`Cerebras error ${resp.status}`);
    }

    const data = await resp.json();
    let botResponse = data.choices?.[0]?.message?.content?.trim() || '';
    if (!botResponse) {
      botResponse = isInitialization
        ? "Hello! I've reviewed your report and I'm here to help you understand it. What would you like to know?"
        : "I understand. Could you tell me a bit more about what you'd like to know regarding your report?";
    }

    return new Response(JSON.stringify({ response: botResponse, sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in voiceflow-chat (cerebras):', error);
    return new Response(JSON.stringify({
      error: 'technical difficulties',
      response: "I'm having a little trouble right now. Please try again in a moment. For urgent concerns, please contact a healthcare professional.",
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
