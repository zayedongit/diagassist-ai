import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check if device should be remembered
      const isRemembered = localStorage.getItem('daigassist_remember_device') === 'true';
      
      console.log('Auth check - isRemembered:', isRemembered);
      
      // If device is remembered, mark session as active and keep user signed in
      if (isRemembered) {
        sessionStorage.setItem('daigassist_session_active', 'true');
        console.log('Device remembered - session will persist');
        return; // Don't sign out, let session continue
      }
      
      // If device is NOT remembered and there's no active session, clear auth
      const sessionActive = sessionStorage.getItem('daigassist_session_active') === 'true';
      if (!sessionActive) {
        console.log('Device not remembered and no active session - clearing auth');
        await supabase.auth.signOut();
        setIsLoading(false);
      }
    };

    // Run auth check first
    initAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id ? 'User found' : 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    session,
    isLoading,
    signOut,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};