import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.functions.invoke('check-admin-role', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (rpcError) {
        console.error('Error checking admin role:', rpcError);
        setError(rpcError.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.isAdmin || false);
      }
    } catch (err) {
      console.error('Error in useAdminCheck:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isLoading, error, refetch: checkAdminStatus };
}
