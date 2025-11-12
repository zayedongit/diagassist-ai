import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

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

    const { action, linkId, updates } = await req.json();

    switch (action) {
      case 'list': {
        const { data: links, error } = await supabase
          .from('demo_links')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ links }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!linkId) throw new Error('linkId is required');

        const { data: link, error } = await supabase
          .from('demo_links')
          .select('*')
          .eq('id', linkId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ link }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!linkId || !updates) throw new Error('linkId and updates are required');

        const { data: link, error } = await supabase
          .from('demo_links')
          .update(updates)
          .eq('id', linkId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, link }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!linkId) throw new Error('linkId is required');

        const { error } = await supabase
          .from('demo_links')
          .delete()
          .eq('id', linkId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle-active': {
        if (!linkId) throw new Error('linkId is required');

        // Get current status
        const { data: current } = await supabase
          .from('demo_links')
          .select('active')
          .eq('id', linkId)
          .single();

        // Toggle it
        const { data: link, error } = await supabase
          .from('demo_links')
          .update({ active: !current?.active })
          .eq('id', linkId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, link }),
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
    console.error('Error in manage-demo-links:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
