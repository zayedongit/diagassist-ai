import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Share token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch the share record
    const { data: share, error: shareError } = await supabase
      .from('report_shares')
      .select('*')
      .eq('share_token', token)
      .single();

    if (shareError || !share) {
      console.error('Share not found:', shareError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired share link' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if revoked
    if (share.revoked) {
      return new Response(
        JSON.stringify({ error: 'This share link has been revoked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(share.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'This share link has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
      );
    }

    // Fetch the report
    const { data: report, error: reportError } = await supabase
      .from('pdf_analyses')
      .select('*')
      .eq('id', share.report_id)
      .single();

    if (reportError || !report) {
      console.error('Report not found:', reportError);
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Update access tracking
    await supabase
      .from('report_shares')
      .update({
        accessed_at: new Date().toISOString(),
        access_count: (share.access_count || 0) + 1
      })
      .eq('id', share.id);

    // Return report data
    return new Response(
      JSON.stringify({
        success: true,
        report,
        shareInfo: {
          created_at: share.created_at,
          expires_at: share.expires_at,
          access_count: share.access_count + 1,
          notes: share.notes
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-report-share:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
