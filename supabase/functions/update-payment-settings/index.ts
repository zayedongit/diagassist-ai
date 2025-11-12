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

    const { paymentRequired, razorpayEnabled, basicPrice, premiumPrice } = await req.json();

    const updateData: any = { updated_at: new Date().toISOString(), updated_by: user.id };
    
    if (paymentRequired !== undefined) updateData.payment_required = paymentRequired;
    if (razorpayEnabled !== undefined) updateData.razorpay_enabled = razorpayEnabled;
    if (basicPrice !== undefined) updateData.basic_tier_price_inr = basicPrice;
    if (premiumPrice !== undefined) updateData.premium_tier_price_inr = premiumPrice;

    // Get first settings row
    const { data: existing } = await supabase
      .from('payment_settings')
      .select('id')
      .limit(1)
      .single();

    const { data: settings, error } = await supabase
      .from('payment_settings')
      .update(updateData)
      .eq('id', existing?.id!)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, settings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-payment-settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
