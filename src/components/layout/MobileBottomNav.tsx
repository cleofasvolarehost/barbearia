import { Home, Calendar, Users, DollarSign, Menu, CalendarClock, LayoutDashboard, Settings, Receipt, Megaphone, Shield, Activity, Crown, Palette, MessageCircle, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  action?: () => void;
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const location = useLocation();
  const activeView = location.pathname;
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
        // Try to get from metadata first for speed, then verify with DB if needed
        // Actually, just fetch from DB to be safe
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

  // Define Items per Role
  const getNavItems = (): NavItem[] => {
      const common: NavItem = { id: '/menu', icon: Menu, label: 'Menu', action: onMenuClick };

      if (role === 'client') {
          return [
              { id: '/', icon: Home, label: 'Início' },
              { id: '/minhas-reservas', icon: CalendarClock, label: 'Histórico' },
              { id: '/fidelidade', icon: Award, label: 'Fidelidade' },
              { id: '/perfil', icon: Users, label: 'Perfil' },
          ];
      }

      if (role === 'barber') {
          return [
              { id: '/admin/dashboard', icon: Calendar, label: 'Agenda' }, // Barber sees agenda in dashboard? Or separate view?
              { id: '/clientes', icon: Users, label: 'Clientes' },
              { id: '/perfil', icon: Users, label: 'Perfil' },
              common
          ];
      }

      if (role === 'owner') {
          return [
              { id: '/admin/dashboard', icon: LayoutDashboard, label: 'Painel' },
              { id: '/admin/appointments', icon: Calendar, label: 'Agenda' }, // Maybe link to specific agenda view?
              { id: '/admin/team', icon: Users, label: 'Equipe' },
              common
          ];
      }

      if (role === 'super_admin') {
          return [
              { id: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Visão' },
              { id: '/super-admin/tenants', icon: Building2, label: 'Lojas' },
              common
          ];
      }

      // Default (Guest or Loading)
      return [
          { id: '/', icon: Home, label: 'Início' },
          { id: '/login', icon: Users, label: 'Login' }
      ];
  };

  const navItems = getNavItems();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="backdrop-blur-xl bg-[#121212]/90 border-t border-white/10 px-2 py-2 pb-safe shadow-[0_-8px_32px_0_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-around">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            // Handle duplicate IDs (like Dashboard/Agenda for owner) by index if needed, but here ID is mostly for highlighting
            const isActive = activeView === item.id;
            
            // If action is provided (Menu), use button
            if (item.action) {
                return (
                    <button
                        key={`nav-${idx}`}
                        onClick={item.action}
                        className="relative flex flex-col items-center gap-1 px-4 py-2 w-full"
                    >
                        <Icon className="w-6 h-6 text-white/60" />
                        <span className="text-[10px] text-white/60 font-medium">{item.label}</span>
                    </button>
                );
            }

            return (
              <Link
                key={`nav-${idx}`}
                to={item.id}
                className="relative flex flex-col items-center gap-1 px-4 py-2 w-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -top-2 w-8 h-1 bg-[#7C3AED] rounded-full shadow-[0_0_10px_#7C3AED]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon 
                  className={`w-6 h-6 relative z-10 transition-colors ${
                    isActive ? 'text-[#7C3AED]' : 'text-white/60'
                  }`}
                />
                <span 
                  className={`text-[10px] font-medium relative z-10 transition-colors ${
                    isActive ? 'text-white' : 'text-white/60'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper to get secondary drawer items based on role
export function getDrawerItems(role: string | null) {
    if (role === 'owner') {
        return [
            { id: '/financeiro', icon: DollarSign, label: 'Financeiro' },
            { id: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
            { id: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
            { id: '/admin/services', icon: Calendar, label: 'Serviços' },
            { id: '/admin/team', icon: Users, label: 'Equipe' }, // Also in bottom nav, but good to have here too? No, keep it distinct.
            { id: '/admin/plans', icon: Receipt, label: 'Planos VIP' },
            // Personalizar moved to Configurações
            { id: '/admin/subscription', icon: Crown, label: 'Assinatura' },
            { id: '/admin/pagamentos', icon: DollarSign, label: 'Recebimentos' },
            { id: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
        ];
    }
    if (role === 'super_admin') {
        return [
            { id: '/super-admin/subscriptions', icon: Receipt, label: 'Assinaturas' },
            { id: '/super-admin/gateways', icon: Shield, label: 'Gateways' },
            { id: '/super-admin/system', icon: Activity, label: 'Sistema' },
        ];
    }
    return []; // Others don't have secondary drawer items yet
}
