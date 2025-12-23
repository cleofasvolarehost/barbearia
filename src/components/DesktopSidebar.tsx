import { Home, Calendar, Users, DollarSign, Settings, LogOut, Zap, Megaphone, MessageCircle, Shield, LayoutDashboard, Building2, Receipt, Activity, Crown, Palette, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface DesktopSidebarProps {
  onViewChange?: (view: string) => void;
}

export function DesktopSidebar({ onViewChange }: DesktopSidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const activeView = location.pathname;
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
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  // Base items available to Owner and Barber (some filtered later)
  const allNavItems = [
    // Owner / Barber
    { id: '/admin/dashboard', icon: Home, label: 'Início', roles: ['owner', 'barber'] },
    { id: '/admin/marketing', icon: Megaphone, label: 'Marketing', roles: ['owner'] },
    { id: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp', roles: ['owner'] },
    { id: '/admin/configuracoes', icon: Building2, label: 'Minha Barbearia', roles: ['owner'] },
    { id: '/admin/pagamentos', icon: DollarSign, label: 'Recebimentos', roles: ['owner'] },
    { id: '/clientes', icon: Users, label: 'Clientes', roles: ['owner', 'barber'] },
    { id: '/financeiro', icon: DollarSign, label: 'Financeiro', roles: ['owner'] },
    { id: '/admin/team', icon: Users, label: 'Equipe', roles: ['owner'] },
    { id: '/admin/services', icon: Calendar, label: 'Serviços', roles: ['owner'] },
    { id: '/admin/plans', icon: Receipt, label: 'Planos VIP', roles: ['owner'] },
    // Personalizar moved to Minha Barbearia
    { id: '/admin/subscription', icon: Crown, label: 'Minha Assinatura', roles: ['owner'] },
    
    // Super Admin - God Mode
    { id: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Visão Geral', roles: ['super_admin'] },
    { id: '/super-admin/tenants', icon: Building2, label: 'Barbearias', roles: ['super_admin'] },
    { id: '/super-admin/subscriptions', icon: Receipt, label: 'Assinaturas', roles: ['super_admin'] },
    { id: '/super-admin/gateways', icon: Shield, label: 'Gateways', roles: ['super_admin'] },
    { id: '/super-admin/system', icon: Activity, label: 'Sistema', roles: ['super_admin'] },
  ];

  const filteredNavItems = allNavItems.filter(item => {
      if (!role) return false;
      
      // Special handling for Super Admin navigating between modes
      if (role === 'super_admin') {
          // If in God Mode area, show God Mode items
          if (activeView.startsWith('/super-admin')) {
              return item.roles.includes('super_admin');
          } 
          // If in Shop/Admin area, show Owner items (Super Admin has full access)
          return item.roles.includes('owner');
      }

      return item.roles.includes(role);
  });

  return (
    <div className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 p-6 bg-[#121212] border-r border-white/10">
      {/* Logo / Brand */}
      <div className="mb-8">
        <div className="flex items-center gap-3 px-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white">CyberBarber</h2>
            <p className="text-white/40 text-xs">
                {role === 'owner' ? 'Painel Dono' : role === 'barber' ? 'Painel Barbeiro' : role === 'super_admin' ? 'Super Admin' : 'Painel'}
            </p>
          </div>
        </div>
      </div>

      {/* Teleport for Super Admin */}
      {role === 'super_admin' && (
          <div className="px-4 mb-6">
              {activeView.startsWith('/super-admin') ? (
                  <Link to="/admin/dashboard" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
                      <Store className="w-4 h-4" /> Ir para Minha Loja
                  </Link>
              ) : (
                  <Link to="/super-admin/dashboard" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white text-xs font-bold py-3 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
                      <Crown className="w-4 h-4" /> Voltar ao God Mode
                  </Link>
              )}
          </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <Link
              key={item.id}
              to={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative ${
                isActive 
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavItem"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#2DD4BF]/20 border border-[#7C3AED]/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-[#7C3AED]' : ''}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <GlassCard className="p-4 mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF]"></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-white text-sm truncate">{user?.email}</p>
            <p className="text-white/60 text-xs capitalize">{role || 'Carregando...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/perfil" className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-white/60 hover:text-white transition-all">
            <Settings className="w-4 h-4" />
          </Link>
          <button 
            onClick={handleLogout}
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-white/60 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
