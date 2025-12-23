import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DesktopSidebar } from '../DesktopSidebar';
import { MobileNavigation } from '../MobileNavigation';
import { FloatingActionButton } from '../FloatingActionButton';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
            if (data) setRole(data.tipo);
        });
    } else {
        setRole(null);
    }
  }, [user]);

  // Rotas onde a Sidebar Administrativa NÃO deve aparecer
  // Basicamente: Home, Login, Cadastro, e Fluxo de Agendamento do Cliente
  const isPublicRoute = 
    path === '/' || 
    path === '/login' || 
    path === '/cadastro' || 
    path === '/agendamento' ||
    path === '/servicos' ||
    path.startsWith('/agendar/'); // Hide on booking flow

  // Show Admin Controls only for allowed roles
  const showAdminControls = !isPublicRoute && (role === 'owner' || role === 'barber' || role === 'super_admin');

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Exibe Sidebar apenas se NÃO for rota pública E se for admin/owner/barber */}
      {/* Actually, Sidebar handles its own filtering, but usually clients don't see the admin sidebar at all. */}
      {/* If client logs in, they go to /minhas-reservas. Do they need a sidebar? Maybe a simplified one? */}
      {/* For now, let's keep Sidebar logic as is (it shows for logged in users), but maybe we hide it for clients? */}
      {/* DesktopSidebar has "Painel Barbeiro" etc. It might not be designed for clients. */}
      {/* Let's check if DesktopSidebar handles 'client' role gracefully. It seems it filters items. */}
      
      {!isPublicRoute && role !== 'client' && <DesktopSidebar />}

      {/* Ajusta margem: Se tiver sidebar, margem esquerda. Se não, centralizado/full width */}
      <main className={`${(!isPublicRoute && role !== 'client') ? 'md:ml-64' : ''} min-h-screen ${!isPublicRoute ? 'pb-24 md:pb-8' : ''}`}>
        {children}
      </main>

      {/* FAB apenas para Admin (pode ajustar lógica se quiser que suma também) */}
      {showAdminControls && <FloatingActionButton onAddClient={() => console.log('Add client')} />}

      {/* Mobile Nav apenas para Admin */}
      {showAdminControls && <MobileNavigation />}

      {/* Toast Notifications */}
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1E1E1E',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      }} />
    </div>
  );
}
