import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If a specific role is required, check for it
  // For now, we don't have role checking, but structure is here for future
  if (requiredRole) {
    // TODO: Implement role checking when needed
    // const hasRole = await checkUserRole(user.id, requiredRole);
    // if (!hasRole) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
