import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get current user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create RLS-bound client using user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get current user and check admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: hasAdminRole } = await supabase.rpc('current_user_has_role', { _role: 'admin' });
    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for user deletion (only after authorization)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    if (req.method === 'POST') {
      const { userIds } = await req.json();

      // Admin authorization already checked above

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'User IDs array is required' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Deleting users: ${userIds.join(', ')}`);

      // Delete users one by one
      const results = [];
      for (const userId of userIds) {
        try {
          // First delete related profile and doctor records to avoid foreign key constraints
          console.log(`Cleaning up database records for user ${userId}`);
          
          // Get profile ID first
          const { data: profile } = await supabaseServiceRole
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (profile) {
            // Delete from doctors table if exists
            await supabaseServiceRole
              .from('doctors')
              .delete()
              .eq('profile_id', profile.id);
          }
          
          // Delete from profiles table
          await supabaseServiceRole
            .from('profiles')
            .delete()
            .eq('user_id', userId);
          
          // Then delete the auth user
          console.log(`Deleting auth user ${userId}`);
          const { error } = await supabaseServiceRole.auth.admin.deleteUser(userId);
          
          if (error) {
            console.error(`Error deleting user ${userId}:`, error);
            results.push({ userId, success: false, error: error.message });
          } else {
            console.log(`Successfully deleted user ${userId}`);
            results.push({ userId, success: true });
          }
        } catch (error) {
          console.error(`Exception deleting user ${userId}:`, error);
          results.push({ userId, success: false, error: error.message });
        }
      }

      return new Response(
        JSON.stringify({ 
          message: 'Delete operation completed',
          results 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET request - return list of users (admin only)
    if (req.method === 'GET') {
      console.log('Fetching all users from auth (admin request)');
      const { data: users, error } = await supabaseServiceRole.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching users:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Found ${users.users?.length || 0} users`);
      return new Response(
        JSON.stringify({ users: users.users || [] }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})