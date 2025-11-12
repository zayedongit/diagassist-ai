import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    // Create client with proper authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
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

    // Get all profiles
    let profilesQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      profilesQuery = profilesQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesError, count } = await profilesQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (profilesError) {
      console.error('Profiles query error:', profilesError);
      throw profilesError;
    }

    console.log('Fetched profiles:', profiles?.length);

    // Get roles for these users
    const userIds = profiles?.map(p => p.user_id) || [];
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    // Create a map of user_id to roles
    const rolesMap = (userRoles || []).reduce((acc: any, ur: any) => {
      if (!acc[ur.user_id]) acc[ur.user_id] = [];
      acc[ur.user_id].push(ur.role);
      return acc;
    }, {});

    // Get analysis counts for each user
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
      roles: rolesMap[profile.user_id] || [],
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
