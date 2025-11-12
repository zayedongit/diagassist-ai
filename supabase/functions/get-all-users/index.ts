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

    // Use service role to check admin and fetch data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Get profiles with roles
    let query = supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (profilesError) {
      throw profilesError;
    }

    // Get analysis counts for each user
    const userIds = profiles?.map(p => p.user_id) || [];
    const { data: analysisCounts } = await supabase
      .from('pdf_analyses')
      .select('user_id')
      .in('user_id', userIds);

    const countsByUser = analysisCounts?.reduce((acc: any, curr: any) => {
      acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
      return acc;
    }, {}) || {};

    const usersWithCounts = profiles?.map(profile => ({
      ...profile,
      roles: profile.user_roles?.map((r: any) => r.role) || [],
      analysisCount: countsByUser[profile.user_id] || 0
    }));

    return new Response(
      JSON.stringify({
        users: usersWithCounts,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        currentPage: page
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-all-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
