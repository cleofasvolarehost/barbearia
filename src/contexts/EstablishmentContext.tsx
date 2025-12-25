import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Establishment } from '../types/database';
import { useNavigate, useLocation } from 'react-router-dom';

interface EstablishmentContextType {
  establishment: Establishment | null;
  loading: boolean;
  refreshEstablishment: () => Promise<void>;
}

const EstablishmentContext = createContext<EstablishmentContextType>({
  establishment: null,
  loading: true,
  refreshEstablishment: async () => {},
});

export function EstablishmentProvider({ children }: { children: ReactNode }) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:19',message:'EstablishmentProvider render start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const { user } = useAuth();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:20',message:'useAuth called',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:21',message:'useState establishment called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const [loading, setLoading] = useState(true);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:22',message:'useState loading called',data:{loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const navigate = useNavigate();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:23',message:'useNavigate called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const location = useLocation();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:24',message:'useLocation called',data:{pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  const fetchEstablishment = useCallback(async () => {
    if (!user) {
      setEstablishment(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching establishment:', error);
      }

      setEstablishment(data);
    } catch (error) {
      console.error('Establishment fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEstablishment();
  }, [fetchEstablishment]);

  // Logic: If user logs in and has NO establishment -> Redirect to /admin/setup
  // Logic: If establishment is SUSPENDED -> Redirect to /financeiro (Free Lunch Bug)
  useEffect(() => {
    if (loading) return;
    
    if (user && establishment) {
       // Check for Suspension or Expiration
       const isSuspended = establishment.subscription_status === 'suspended';
       const isExpired = establishment.subscription_end_date && new Date(establishment.subscription_end_date) < new Date();
       
       // Allow access to /financeiro (for history) and /admin/subscription (to pay)
       const isAllowedPath = location.pathname.startsWith('/financeiro') || location.pathname.startsWith('/admin/subscription');

       if ((isSuspended || isExpired) && !isAllowedPath) {
           navigate('/admin/subscription', { replace: true });
           return;
       }
    }

    if (user && !establishment) {
      // Only redirect if trying to access admin pages (except setup itself)
      // This prevents infinite loops and allows normal users (clients) to use the app
      // Also bypass if SUPER ADMIN (they use /super-admin routes)
      if (location.pathname.startsWith('/admin') && location.pathname !== '/admin/setup') {
         // Check if user is NOT super admin (basic check, though role is not in context here, usually handled by ProtectedRoute)
         // Ideally we check role here too, but for now let's trust the ProtectedRoute to handle Super Admin access.
         // However, if a Super Admin goes to /admin/... they might get bounced here.
         navigate('/admin/setup', { replace: true });
      }
    }
  }, [loading, user?.id, establishment, location.pathname, navigate]);

  const value = useMemo(() => ({
    establishment,
    loading,
    refreshEstablishment: fetchEstablishment
  }), [establishment, loading, fetchEstablishment]);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EstablishmentContext.tsx:88',message:'useMemo value called',data:{hasEstablishment:!!establishment,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  return (
    <EstablishmentContext.Provider value={value}>
      {children}
    </EstablishmentContext.Provider>
  );
}

export const useEstablishment = () => useContext(EstablishmentContext);
