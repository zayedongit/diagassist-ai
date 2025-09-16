import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Download, Heart, BarChart3, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentGateProps {
  onPaymentSuccess: () => void;
  showMockPdf: () => void;
}

export const PaymentGate = ({ onPaymentSuccess, showMockPdf }: PaymentGateProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChargeNow = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess();
      toast.success('Payment successful! Premium features unlocked.');
    }, 2000);
  };

  return (
    <Card className="shadow-card border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl text-primary">Unlock Premium Features</CardTitle>
        <p className="text-sm text-muted-foreground">
          Get detailed recommendations, lifestyle tips, and downloadable reports
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Premium Features List */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-background/50">
            <Heart className="w-4 h-4 text-success" />
            <span className="text-sm">Personalized Diet Recommendations</span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-background/50">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm">Detailed Lifestyle Guidelines</span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-background/50">
            <Download className="w-4 h-4 text-accent" />
            <span className="text-sm">Professional PDF Report</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center py-4 border-y border-border/50">
          <div className="text-3xl font-bold text-primary">₹150</div>
          <div className="text-sm text-muted-foreground">One-time payment</div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleChargeNow}
            disabled={isProcessing}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Charge Now - ₹150
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={showMockPdf}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            View Sample Report
          </Button>
        </div>

        <div className="flex items-center justify-center space-x-1 pt-2">
          <Lock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Secure payment processing</span>
        </div>
      </CardContent>
    </Card>
  );
};