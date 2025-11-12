import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

function generateApiKey(): string {
  const prefix = 'lab_';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseAuth = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { action, configId, updates } = await req.json();

    switch (action) {
      case 'list': {
        const { data: configs, error } = await supabase
          .from('lab_configurations')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ configs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!configId) throw new Error('configId is required');

        const { data: config, error } = await supabase
          .from('lab_configurations')
          .select('*')
          .eq('id', configId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ config }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!configId || !updates) throw new Error('configId and updates are required');

        const { data: config, error } = await supabase
          .from('lab_configurations')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', configId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, config }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!configId) throw new Error('configId is required');

        const { error } = await supabase
          .from('lab_configurations')
          .delete()
          .eq('id', configId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'regenerate-key': {
        if (!configId) throw new Error('configId is required');

        const newApiKey = generateApiKey();

        const { data: config, error } = await supabase
          .from('lab_configurations')
          .update({ 
            api_key: newApiKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, apiKey: newApiKey, config }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in manage-lab-configs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
