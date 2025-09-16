import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, analysisContext, isInitialization } = await req.json();
    const voiceflowApiKey = Deno.env.get('VOICEFLOW_API_KEY');

    if (!voiceflowApiKey) {
      throw new Error('Voiceflow API key not configured');
    }

    console.log('Voiceflow chat request:', { message, sessionId, isInitialization });

    let responses = [];

    // If this is initialization, first send the analysis context
    if (isInitialization && analysisContext) {
      console.log('Initializing Voiceflow with analysis context');
      
      const contextMessage = `Patient Analysis Summary: ${analysisContext}. Please start the conversation by asking relevant follow-up questions about this analysis.`;
      
      const initResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${sessionId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': voiceflowApiKey.startsWith('VF.') ? voiceflowApiKey : `Bearer ${voiceflowApiKey}`
        },
        body: JSON.stringify({
          action: {
            type: 'text',
            payload: contextMessage
          },
          config: {
            stripSSML: true,
            excludeTypes: ['block', 'debug', 'flow']
          }
        })
      });

      if (!initResponse.ok) {
        console.error('Failed to initialize Voiceflow:', await initResponse.text());
        throw new Error('Failed to initialize with analysis context');
      }

      const initData = await initResponse.json();
      console.log('Voiceflow initialization response:', initData);
      
      // Extract responses from initialization
      if (initData && Array.isArray(initData)) {
        const textResponses = initData.filter((item: any) => item.type === 'text');
        responses.push(...textResponses);
      }
    }

    // If there's a user message, send it
    if (message && message.trim()) {
      console.log('Sending user message to Voiceflow');
      
      const messageResponse = await fetch(`https://general-runtime.voiceflow.com/state/user/${sessionId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': voiceflowApiKey.startsWith('VF.') ? voiceflowApiKey : `Bearer ${voiceflowApiKey}`
        },
        body: JSON.stringify({
          action: {
            type: 'text',
            payload: message.trim()
          },
          config: {
            stripSSML: true,
            excludeTypes: ['block', 'debug', 'flow']
          }
        })
      });

      if (!messageResponse.ok) {
        console.error('Failed to send message to Voiceflow:', await messageResponse.text());
        throw new Error('Failed to send message to Voiceflow');
      }

      const messageData = await messageResponse.json();
      console.log('Voiceflow message response:', messageData);
      
      // Extract responses from message interaction
      if (messageData && Array.isArray(messageData)) {
        const textResponses = messageData.filter((item: any) => item.type === 'text');
        responses.push(...textResponses);
      }
    }

    // Process all responses
    let botResponse = '';
    if (responses.length > 0) {
      botResponse = responses
        .map((item: any) => item.payload?.message || item.payload)
        .filter(Boolean)
        .join(' ');
    }

    // Fallback responses
    if (!botResponse) {
      if (isInitialization) {
        botResponse = 'Hello! I\'ve reviewed your analysis summary. I\'d like to ask you some follow-up questions to better understand your health concerns. How are you feeling about the results?';
      } else {
        botResponse = 'I understand your question. Could you please provide more specific details about what you\'d like to know regarding your health report?';
      }
    }

    console.log('Final bot response:', botResponse);

    return new Response(JSON.stringify({ 
      response: botResponse,
      sessionId: sessionId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in voiceflow-chat function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
      response: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment. For immediate medical concerns, please consult with a healthcare professional.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});