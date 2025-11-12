import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        paymentRequired: settings?.payment_required || false,
        razorpayEnabled: settings?.razorpay_enabled || false,
        basicPrice: settings?.basic_tier_price_inr || 50,
        premiumPrice: settings?.premium_tier_price_inr || 100
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-payment-settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
