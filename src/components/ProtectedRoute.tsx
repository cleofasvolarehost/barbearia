import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      // Check for Dev Mode Backdoor
      const isDevMode = localStorage.getItem('trae_dev_mode') === 'true';
      if (isDevMode) {
        setIsAuthorized(true);
        return;
      }

      if (!user) {
        console.log('ProtectedRoute: No user found, denying access.');
        setIsAuthorized(false);
        return;
      }

      // If no specific roles required, just being logged in is enough
      if (!allowedRoles || allowedRoles.length === 0) {
        setIsAuthorized(true);
        return;
      }

      try {
        let { data, error } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('id', user.id)
          .maybeSingle(); // Changed from single() to maybeSingle() to handle null gracefully

        // Self-heal: Create profile if missing
        if (!data || (error && error.code === 'PGRST116')) {
             console.log('ProtectedRoute: Profile missing (null/406). Creating default client profile...');
             // Force client role on insert
             const { error: createError } = await supabase.from('usuarios').insert({
                 id: user.id,
                 email: user.email,
                 nome: user.user_metadata?.nome || 'Usuário',
                 tipo: 'client'
             });
             
             if (!createError) {
                 // On successful creation, assume client role directly to avoid race condition on read
                 data = { tipo: 'client' };
                 error = null;
             } else {
                 console.error('ProtectedRoute: Failed to auto-create profile:', createError);
                 // If insert fails (maybe duplicate?), try reading one last time with a small delay
                 // or just fallback to client if error is "duplicate key"
                 if (createError.code === '23505') { // Unique violation
                     data = { tipo: 'client' }; // Assume it exists now
                     error = null;
                 }
             }
        }

        if (error || !data) {
          console.error('ProtectedRoute: Error fetching user role:', error);
          setIsAuthorized(false);
        } else {
          // Check if user's role is in the allowedRoles array
          // We support both old and new role names just in case
          const userRole = data.tipo;
          
          // SUPER ADMIN BYPASS: Always allow super_admin
          if (userRole === 'super_admin') {
              setIsAuthorized(true);
              return;
          }

          const hasPermission = allowedRoles.includes(userRole as any);
          
          if (!hasPermission) {
              console.warn(`ProtectedRoute: User role ${userRole} not in allowed: ${allowedRoles.join(', ')}`);
          }
          setIsAuthorized(hasPermission);
        }
      } catch (error) {
        console.error('ProtectedRoute: Unexpected error:', error);
        setIsAuthorized(false);
      }
    };

    // If dev mode is on, we don't need to wait for auth loading
    const isDevMode = localStorage.getItem('trae_dev_mode') === 'true';
    if (!loading || isDevMode) {
      checkRole();
    }
  }, [user, loading, allowedRoles]);

  // Bypass loading check if in dev mode
  const isDevMode = localStorage.getItem('trae_dev_mode') === 'true';

  if ((loading && !isDevMode) || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7C3AED]"></div>
      </div>
    );
  }

  if ((!user && !isDevMode) || !isAuthorized) {
    console.log('ProtectedRoute: Redirecting to login. User:', !!user, 'Authorized:', isAuthorized);
    // If not authorized but logged in, it means role mismatch or error
    if (user && !isAuthorized) {
        // SUPER ADMIN BYPASS FIX: Redirect clients attempting to access admin to home
        if (user.user_metadata?.tipo === 'client' || !user.user_metadata?.tipo) {
             return <Navigate to="/" replace />;
        }

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-white p-4">
                <div className="max-w-md text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-2xl">🚫</span>
                    </div>
                    <h2 className="text-xl font-bold text-red-400">Acesso Negado ou Erro de Perfil</h2>
                    <p className="text-gray-400">
                        Não conseguimos verificar suas permissões. Isso pode acontecer se seu perfil de usuário estiver incompleto ou se houver um erro de conexão.
                    </p>
                    <div className="bg-black/30 p-4 rounded-lg text-left text-xs font-mono overflow-auto max-h-40">
                        <p>User ID: {user.id}</p>
                        <p>Email: {user.email}</p>
                        <p>Status: Logged In</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            Tentar Novamente
                        </button>
                        <button 
                            onClick={async () => {
                                await supabase.auth.signOut();
                                window.location.href = '/login';
                            }}
                            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                        >
                            Sair e Relogar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
