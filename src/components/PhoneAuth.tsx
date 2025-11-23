import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone, Lock, CheckCircle, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface PhoneAuthProps {
  onAuthSuccess: (user: any, session: any) => void;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
];

export const PhoneAuth = ({ onAuthSuccess }: PhoneAuthProps) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [rememberDevice, setRememberDevice] = useState(true); // Default to true for convenience

  // Check if device is already remembered on mount and auto-authenticate
  useEffect(() => {
    const autoAuthenticate = async () => {
      const isRemembered = localStorage.getItem('daigassist_remember_device') === 'true';
      const lastLogin = localStorage.getItem('daigassist_last_login');
      
      if (!isRemembered || !lastLogin) {
        console.log('❌ Device not remembered or no last login');
        return;
      }
      
      console.log('✅ Device is remembered - checking session validity');
      
      // Check session validity with age limit
      const lastLoginDate = new Date(lastLogin);
      const currentDate = new Date();
      const daysSinceLogin = (currentDate.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Admin phone gets 90 days, regular users get 30 days
      const savedPhone = localStorage.getItem('daigassist_saved_phone') || '';
      const isAdminPhone = savedPhone === '+917993448425';
      const maxAge = isAdminPhone ? 90 : 30;
      
      console.log('📅 Session age check:', {
        daysSinceLogin: Math.floor(daysSinceLogin),
        maxAge,
        isAdminPhone
      });
      
      if (daysSinceLogin > maxAge) {
        console.log('⏰ Session expired - clearing remembered device');
        localStorage.removeItem('daigassist_remember_device');
        localStorage.removeItem('daigassist_last_login');
        return;
      }
      
      // Check if valid Supabase session exists
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('❌ No valid Supabase session found');
        return;
      }
      
      console.log('🎉 Valid session found - auto-authenticating');
      
      // Auto-authenticate without showing OTP UI
      onAuthSuccess(session.user, session);
      toast.success('Welcome back! Auto-signed in from remembered device.');
    };
    
    autoAuthenticate();
  }, [onAuthSuccess]);

  // Auto-verify OTP when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !loading && !error && step === 'otp') {
      // Small delay to let user see the complete OTP before verification starts
      const timer = setTimeout(() => {
        verifyOTP();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [otp, loading, error, step]);

  const formatPhoneNumber = (phone: string): string => {
    // Remove any existing country code and non-digits
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Remove country code if already present
    if (cleanPhone.startsWith(countryCode.replace('+', ''))) {
      cleanPhone = cleanPhone.slice(countryCode.replace('+', '').length);
    }
    
    // Add selected country code
    return `${countryCode}${cleanPhone}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove country code and non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Remove country code prefix if present
    const phoneWithoutCode = cleanPhone.startsWith(countryCode.replace('+', '')) 
      ? cleanPhone.slice(countryCode.replace('+', '').length)
      : cleanPhone;
    
    // Basic validation - at least 7 digits, max 15 digits
    return phoneWithoutCode.length >= 7 && phoneWithoutCode.length <= 15;
  };

  const sendOTP = async () => {
    setError(null);
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid mobile number');
      return;
    }

    if (!firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    setLoading(true);

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
      setResendTimer(60);
      
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
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setError(null);
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { 
          phone_number: formattedPhone, 
          otp,
          user_type: 'patient',
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Invalid OTP');
      }

      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
        }
      }

      // Store remember device preference with extended duration for admin
      const isAdminPhone = formattedPhone === '+917993448425';
      
      if (rememberDevice) {
        localStorage.setItem('daigassist_remember_device', 'true');
        localStorage.setItem('daigassist_last_login', new Date().toISOString());
        localStorage.setItem('daigassist_saved_phone', formattedPhone);
        sessionStorage.setItem('daigassist_session_active', 'true');
        
        const duration = isAdminPhone ? '90 days' : '30 days';
        console.log(`✅ Device will be remembered for ${duration} - session persists across browser restarts`);
        toast.success(`Device remembered for ${duration} - you won't need to log in again`);
      } else {
        localStorage.removeItem('daigassist_remember_device');
        localStorage.removeItem('daigassist_saved_phone');
        sessionStorage.setItem('daigassist_session_active', 'true'); // Active for current session only
        console.log('⚠️ Device not remembered - you\'ll need to log in after closing browser');
        toast.info('You\'ll need to log in again after closing your browser');
      }

      toast.success('Authentication successful!');
      
      // Determine if this is a new user (profile was just created)
      const isNewUser = data.is_new_user || false;
      
      // Log login event to database for admin dashboard tracking
      console.log('📊 Logging login event for admin dashboard');
      const deviceInfo = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      
      supabase.from('user_login_events').insert({
        user_id: data.user?.id,
        phone_number: formatPhoneNumber(phoneNumber),
        is_new_user: isNewUser,
        device_info: deviceInfo,
        login_timestamp: new Date().toISOString()
      }).then(({ error: loginLogError }) => {
        if (loginLogError) {
          console.error('❌ Login event logging failed:', loginLogError);
        } else {
          console.log('✅ Login event logged successfully');
        }
      });
      
      // Send admin SMS notification for new user sign-in (NON-NEGOTIABLE)
      console.log('📱 FRONTEND: Triggering admin SMS for user sign-in');
      supabase.functions.invoke('send-admin-alert', {
        body: {
          analysisId: 'USER_SIGNIN',
          userId: data.user?.id || 'unknown',
          status: 'success',
          patientName: `${firstName.trim()} ${lastName.trim()}`,
          timestamp: new Date().toISOString(),
          event: 'user_signin',
          phone: formatPhoneNumber(phoneNumber)
        }
      }).then(({ data: alertData, error: alertError }) => {
        if (alertError) {
          console.error('❌ SIGN-IN SMS ALERT FAILED:', alertError);
        } else {
          console.log('✅ SIGN-IN SMS ALERT SUCCESS:', alertData);
        }
      });
      
      onAuthSuccess(data.user, data.session);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (resendTimer > 0) return;
    await sendOTP();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 15) {
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
                disabled={loading}
                className="bg-background border-2 border-border rounded-lg focus:border-primary"
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
                disabled={loading}
                className="bg-background border-2 border-border rounded-lg focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Mobile number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  disabled={loading}
                  className="text-base flex-1"
                />
              </div>
            </div>

            <Button 
              onClick={sendOTP} 
              disabled={loading || !phoneNumber || !firstName.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
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
                disabled={loading}
                maxLength={6}
                className="text-center text-lg sm:text-xl md:text-2xl tracking-wider sm:tracking-widest"
              />
            </div>

            {/* Remember Device Checkbox */}
            <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg border border-border">
              <Checkbox
                id="remember"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                disabled={loading}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Remember this device
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Stay logged in and skip verification next time
                </p>
              </div>
            </div>

            <Button 
              onClick={verifyOTP} 
              disabled={loading || otp.length !== 6}
              className="w-full"
              size="lg"
            >
              {loading ? (
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
                disabled={resendTimer > 0 || loading}
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
              disabled={loading}
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
