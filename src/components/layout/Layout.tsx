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
import { TopNavbar } from './TopNavbar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:17',message:'Layout render start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const location = useLocation();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:18',message:'useLocation called',data:{pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const path = location.pathname;
  const { user, signOut } = useAuth();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:20',message:'useAuth called',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const [role, setRole] = useState<string | null>(null);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:21',message:'useState role called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:22',message:'useState isDrawerOpen called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Layout.tsx:60',message:'Before conditional component render',data:{showSidebar,showMobileNav,willRenderMobileHeader:showNav,willRenderDesktopSidebar:showSidebar},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

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
        {/* Top Navbar for Context Switching */}
        {showSidebar && <TopNavbar />}
        
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
