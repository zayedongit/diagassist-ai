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

    // Check if user is admin by phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('user_id', user.id)
      .single();
    
    if (!profile || profile.phone_number !== '+917993448425') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // 'all', 'completed', 'failed', 'pending'
    const notificationStatus = url.searchParams.get('notificationStatus'); // 'sent', 'failed', 'pending'
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('pdf_analyses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by analysis status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by notification status
    if (notificationStatus === 'sent') {
      query = query.eq('admin_alerted', true);
    } else if (notificationStatus === 'failed') {
      query = query.eq('admin_alerted', false).not('error_message', 'is', null);
    } else if (notificationStatus === 'pending') {
      query = query.eq('admin_alerted', false).is('error_message', null);
    }

    const { data: analyses, error, count } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        analyses, 
        total: count || 0,
        limit,
        offset
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-all-analyses:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
