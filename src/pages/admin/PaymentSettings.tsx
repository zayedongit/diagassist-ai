import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, CreditCard, TrendingUp } from 'lucide-react';

interface PaymentSettings {
  id: string;
  payment_enabled: boolean;
  razorpay_enabled: boolean;
  razorpay_key_id: string | null;
  basic_tier_price: number;
  enhanced_tier_price: number;
  premium_tier_price: number;
  currency: string;
}

export default function PaymentSettings() {
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [basicPrice, setBasicPrice] = useState(50);
  const [enhancedPrice, setEnhancedPrice] = useState(100);
  const [premiumPrice, setPremiumPrice] = useState(100);

  const queryClient = useQueryClient();

  // Fetch payment settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['paymentSettings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-payment-settings');
      if (error) throw error;
      
      if (data?.settings) {
        const s = data.settings as PaymentSettings;
        setPaymentEnabled(s.payment_enabled);
        setRazorpayEnabled(s.razorpay_enabled);
        setRazorpayKeyId(s.razorpay_key_id || '');
        setBasicPrice(s.basic_tier_price);
        setEnhancedPrice(s.enhanced_tier_price);
        setPremiumPrice(s.premium_tier_price);
        return s;
      }
      return null;
    },
  });

  // Update payment settings mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('update-payment-settings', {
        body: {
          payment_enabled: paymentEnabled,
          razorpay_enabled: razorpayEnabled,
          razorpay_key_id: razorpayKeyId || null,
          basic_tier_price: basicPrice,
          enhanced_tier_price: enhancedPrice,
          premium_tier_price: premiumPrice,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentSettings'] });
      toast.success('Payment settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payment Settings</h2>
        <p className="text-muted-foreground">
          Configure payment requirements and Razorpay integration
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Basic Tier</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{basicPrice}</div>
            <p className="text-xs text-muted-foreground">Report analysis only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enhanced Tier</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{enhancedPrice}</div>
            <p className="text-xs text-muted-foreground">With optional chat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Tier</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{premiumPrice}</div>
            <p className="text-xs text-muted-foreground">Full integrated flow</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Payment Control</CardTitle>
          <CardDescription>
            Enable or disable payment requirements for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="paymentEnabled">Payment Required</Label>
              <p className="text-sm text-muted-foreground">
                Require payment for all non-demo users
              </p>
            </div>
            <Switch
              id="paymentEnabled"
              checked={paymentEnabled}
              onCheckedChange={setPaymentEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="razorpayEnabled">Razorpay Integration</Label>
              <p className="text-sm text-muted-foreground">
                Enable Razorpay payment gateway
              </p>
            </div>
            <Switch
              id="razorpayEnabled"
              checked={razorpayEnabled}
              onCheckedChange={setRazorpayEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {razorpayEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Razorpay Configuration</CardTitle>
            <CardDescription>
              Configure your Razorpay payment gateway settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razorpayKeyId">Razorpay Key ID</Label>
              <Input
                id="razorpayKeyId"
                type="text"
                placeholder="rzp_test_xxxxxxxxxxxxx"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your Razorpay API key ID (public key)
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Secret key should be stored in environment variables</li>
                <li>Never expose secret keys in frontend code</li>
                <li>Use test keys for development environment</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tier Pricing</CardTitle>
          <CardDescription>
            Set prices for each feature tier (in Rupees)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="basicPrice">Basic Tier Price</Label>
              <Input
                id="basicPrice"
                type="number"
                value={basicPrice}
                onChange={(e) => setBasicPrice(parseInt(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enhancedPrice">Enhanced Tier Price</Label>
              <Input
                id="enhancedPrice"
                type="number"
                value={enhancedPrice}
                onChange={(e) => setEnhancedPrice(parseInt(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premiumPrice">Premium Tier Price</Label>
              <Input
                id="premiumPrice"
                type="number"
                value={premiumPrice}
                onChange={(e) => setPremiumPrice(parseInt(e.target.value))}
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          size="lg"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
