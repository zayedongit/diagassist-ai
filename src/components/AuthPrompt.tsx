import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneAuth } from '@/components/PhoneAuth';
import { Calendar, TrendingUp, Bell, FileText, X } from 'lucide-react';

interface AuthPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess?: () => void; // Optional callback after successful authentication
}

export const AuthPrompt = ({ open, onOpenChange, onAuthSuccess }: AuthPromptProps) => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const handleAuthSuccess = (user: any, session: any) => {
    onOpenChange(false);
    if (onAuthSuccess) {
      // Custom callback provided, execute it
      onAuthSuccess();
    } else {
      // Default behavior: navigate to reports
      navigate('/my-reports');
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        {!showAuth ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">
                Track Your Health Journey
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Sign in to save your reports and track your progress over time
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white/80" />
                    </div>
                    <h4 className="font-semibold text-sm text-white/90">Report History</h4>
                    <p className="text-xs text-muted-foreground">
                      Access all your past reports
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-purple-100">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-sm text-white/90">Score Timeline</h4>
                    <p className="text-xs text-muted-foreground">
                      Track health score trends
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-sm text-white/90">30-Day Plan</h4>
                    <p className="text-xs text-muted-foreground">
                      Interactive health calendar
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-sm text-white/90">Reminders</h4>
                    <p className="text-xs text-muted-foreground">
                      Get activity notifications
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={() => setShowAuth(true)}
                  size="lg"
                  className="w-full"
                >
                  Sign In to Continue
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  size="lg"
                  className="w-full"
                >
                  Maybe Later
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Quick sign-in with OTP • No password required
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">
                  Sign In
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuth(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                Enter your mobile number to continue
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <PhoneAuth onAuthSuccess={handleAuthSuccess} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
