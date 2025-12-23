import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const { user } = useAuth();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchEstablishment = async () => {
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
  };

  useEffect(() => {
    fetchEstablishment();
  }, [user?.id]);

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

  return (
    <EstablishmentContext.Provider value={{ establishment, loading, refreshEstablishment: fetchEstablishment }}>
      {children}
    </EstablishmentContext.Provider>
  );
}

export const useEstablishment = () => useContext(EstablishmentContext);
