import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhoneAuthProps {
  onAuthSuccess: (user: any, session: any) => void;
}

export const PhoneAuth = ({ onAuthSuccess }: PhoneAuthProps) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Add +91 prefix if not present and format
    if (!digits.startsWith('91') && digits.length === 10) {
      return `+91${digits}`;
    }
    return `+${digits}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    return /^\+91[6-9]\d{9}$/.test(formatted);
  };

  const sendOTP = async () => {
    setError(null);
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Indian mobile number');
      return;
    }

    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

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

      toast.success('OTP sent to your mobile number');
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
          user_type: 'patient',
          first_name: firstName.trim(),
          last_name: lastName.trim()
        }
      });

      if (error) throw error;

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

      toast.success('Authentication successful!');
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <div className="flex justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            {step === 'phone' ? (
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            )}
          </div>
        </div>
        <div className="px-4">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">
            {step === 'phone' ? 'Enter Mobile Number' : 'Verify OTP'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {step === 'phone' 
              ? 'We\'ll send you a verification code' 
              : `Enter the 6-digit code sent to ${formatPhoneNumber(phoneNumber)}`
            }
          </p>
        </div>
      </div>

      <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name (Optional)</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex">
                  <div className="flex items-center px-2 sm:px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <span className="text-xs sm:text-sm text-foreground">+91</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={isLoading}
                    className="rounded-l-none text-sm sm:text-base"
                    maxLength={10}
                  />
                </div>
              </div>

              <Button 
                onClick={sendOTP} 
                disabled={isLoading || !phoneNumber || !firstName.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
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
                    Verify OTP
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
                Change Number
              </Button>
            </div>
          )}

        <div className="text-xs text-center text-muted-foreground">
          By continuing, you agree to receive SMS messages for verification.
        </div>
      </div>
    </div>
  );
};