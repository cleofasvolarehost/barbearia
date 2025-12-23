import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DesktopSidebar } from '../DesktopSidebar';
import { MobileBottomNav, getDrawerItems } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';
import { MobileDrawer } from './MobileDrawer';
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
  const { user, signOut } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Public Routes (No Nav)
  // Landing Page, Login, Register, Forgot Password
  const isPublicRoute = 
    path === '/' || 
    path === '/login' || 
    path === '/cadastro' || 
    path === '/recuperar-senha' ||
    path === '/reset-password' ||
    path === '/partner/register';

  // Booking Flow specific check (might want nav or not?)
  // Usually booking flow is focused. But if logged in, maybe yes?
  // Let's hide for now to keep it clean, or follow previous logic.
  // Previous logic: path.startsWith('/agendar/') was hidden.

  const showNav = !isPublicRoute && user; // Only show nav if logged in and not on public page

  // Desktop Sidebar: Only for Admin/Owner/Barber (Not Clients)
  const showSidebar = showNav && role !== 'client';

  // Mobile Nav: For Everyone Logged In
  const showMobileNav = showNav;

  const handleLogout = async () => {
      await signOut();
      window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Mobile Header (Sticky Top) */}
      {showMobileNav && <MobileHeader />}

      {/* Desktop Sidebar */}
      {showSidebar && <DesktopSidebar />}

      {/* Main Content */}
      <main className={`
        min-h-screen transition-all duration-300
        ${showSidebar ? 'md:ml-64' : ''} 
        ${showMobileNav ? 'pt-20 pb-24 md:pt-0 md:pb-8' : ''} 
      `}>
        {children}
      </main>

      {/* FAB (Admin Only) */}
      {showSidebar && <FloatingActionButton onAddClient={() => console.log('Add client')} />}

      {/* Mobile Bottom Nav */}
      {showMobileNav && (
        <MobileBottomNav onMenuClick={() => setIsDrawerOpen(true)} />
      )}

      {/* Mobile Drawer (Menu) */}
      <MobileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        items={getDrawerItems(role)}
        role={role}
        onLogout={handleLogout}
        userEmail={user?.email}
      />

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
