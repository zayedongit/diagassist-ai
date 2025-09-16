import { useNavigate } from 'react-router-dom';
import { AdminPhoneAuth } from '@/components/AdminPhoneAuth';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

const PhoneAuthPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to home
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleAuthSuccess = () => {
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <AdminPhoneAuth onAuthSuccess={handleAuthSuccess} />;
};

export default PhoneAuthPage;