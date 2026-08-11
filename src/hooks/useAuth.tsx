import { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';

// Login has been removed. The app runs as an anonymous, account-free session.
// A stable per-browser id lets us correlate an in-flight analysis job without
// collecting any personal information. Nothing here touches Supabase auth, so
// the app needs no auth provider configured on the backend.

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const ANON_ID_KEY = 'diagassist_anon_id';

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon-local';
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signOut: async () => {},
  isAuthenticated: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Synthetic anonymous identity so existing gates (isAuthenticated / user)
  // all pass with no login step. Only `id` is ever read downstream.
  const anonUser = { id: getAnonId() } as unknown as User;

  const value: AuthContextType = {
    user: anonUser,
    session: null,
    isLoading: false,
    signOut: async () => {},
    isAuthenticated: true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
