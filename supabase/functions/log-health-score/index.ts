import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreData {
  analysis_id?: string;
  overall_score: number;
  metabolic_score?: number;
  cardiovascular_score?: number;
  kidney_score?: number;
  liver_score?: number;
  hematologic_score?: number;
  endocrine_score?: number;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const scoreData: ScoreData = await req.json();

    // Validate score data
    if (
      scoreData.overall_score < 0 ||
      scoreData.overall_score > 100
    ) {
      throw new Error('Invalid score values');
    }

    // Insert score history
    const { data, error } = await supabase
      .from('health_score_history')
      .insert({
        user_id: user.id,
        analysis_id: scoreData.analysis_id,
        overall_score: scoreData.overall_score,
        metabolic_score: scoreData.metabolic_score,
        cardiovascular_score: scoreData.cardiovascular_score,
        kidney_score: scoreData.kidney_score,
        liver_score: scoreData.liver_score,
        hematologic_score: scoreData.hematologic_score,
        endocrine_score: scoreData.endocrine_score,
        notes: scoreData.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting score:', error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error logging health score:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});