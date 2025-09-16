import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminPhoneAuthProps {
  onAuthSuccess: (user: any, session: any) => void;
}

export const AdminPhoneAuth = ({ onAuthSuccess }: AdminPhoneAuthProps) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber] = useState('7993448425'); // Admin phone number (without +91)
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const formatPhoneNumber = (phone: string): string => {
    return `+91${phone}`;
  };

  const sendOTP = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: formattedPhone }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep('otp');
      setResendTimer(60); // 60 seconds countdown
      
      // Start countdown
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast.success(`OTP sent to ${formattedPhone}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    setError(null);
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { 
          phone_number: formattedPhone, 
          otp,
          user_type: 'patient', // Keep as patient for now
          first_name: 'Admin',
          last_name: 'User'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        // Extract error message from FunctionsHttpError
        if (error.context?.json?.error) {
          throw new Error(error.context.json.error);
        } else if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          throw new Error('Authentication failed. Please check your OTP and try again.');
        }
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // Set the session in Supabase
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
        }
      }

      toast.success('Admin authentication successful!');
      onAuthSuccess(data.user, data.session);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (resendTimer > 0) return;
    await sendOTP();
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              {step === 'phone' ? (
                <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              ) : (
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              )}
            </div>
          </div>
          <div className="px-4">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              {step === 'phone' ? 'Admin Access' : 'Verify Admin OTP'}
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {step === 'phone' 
                ? 'Click to send OTP to admin phone number' 
                : `Enter the 6-digit code sent to ${formatPhoneNumber(phoneNumber)}`
              }
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Admin Phone Number</Label>
                <div className="flex">
                  <div className="flex items-center px-2 sm:px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <span className="text-xs sm:text-sm text-foreground">+91</span>
                  </div>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    disabled
                    className="rounded-l-none bg-muted text-sm sm:text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Admin phone number is pre-configured
                </p>
              </div>

              <Button 
                onClick={sendOTP} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send Admin OTP'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={isLoading}
                  maxLength={6}
                  className="text-center text-lg sm:text-xl md:text-2xl tracking-wider sm:tracking-widest"
                />
              </div>

              <Button 
                onClick={verifyOTP} 
                disabled={isLoading || otp.length !== 6}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Admin Access
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={resendOTP}
                  disabled={resendTimer > 0 || isLoading}
                  className="text-sm"
                >
                  {resendTimer > 0 
                    ? `Resend OTP in ${resendTimer}s`
                    : 'Resend OTP'
                  }
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
                className="w-full"
                disabled={isLoading}
              >
                Back
              </Button>
            </div>
          )}

          <div className="text-xs text-center text-muted-foreground">
            Admin access restricted to authorized personnel only
          </div>
        </CardContent>
      </Card>
    </div>
  );
};