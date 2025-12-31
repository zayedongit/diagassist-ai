import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface GlobalNavProps {
  theme?: 'light' | 'dark';
}

export const GlobalNav = ({ theme = 'dark' }: GlobalNavProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const textColor = theme === 'dark' ? 'text-white' : 'text-navy';
  const hoverBg = theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-navy/10';
  
  const handleSignInClick = () => {
    if (user) {
      signOut();
      toast.success("Signed out successfully");
    } else {
      window.dispatchEvent(new Event('open-auth-dialog'));
    }
  };
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`text-lg sm:text-xl md:text-2xl font-poppins font-bold hover:opacity-80 transition-opacity ${textColor}`}
        >
          Diagassist
        </button>
        
        <button
          onClick={handleSignInClick}
          className={`p-2 sm:p-2.5 ${hoverBg} rounded-full transition-colors backdrop-blur-sm`}
        >
          <User className={`h-5 w-5 sm:h-6 sm:w-6 ${textColor}`} />
        </button>
      </div>
    </div>
  );
};
