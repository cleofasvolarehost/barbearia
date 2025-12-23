import { Home, Calendar, Users, DollarSign, Menu, CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion'; // Use framer-motion
import { Link, useLocation } from 'react-router-dom';

interface MobileNavigationProps {
  onViewChange?: (view: string) => void;
}

export function MobileNavigation({ onViewChange }: MobileNavigationProps) {
  const location = useLocation();
  const activeView = location.pathname;

  const navItems = [
    { id: '/', icon: Home, label: 'Início' },
    { id: '/minhas-reservas', icon: CalendarClock, label: 'Reservas' }, // Changed from /agendamento
    // { id: '/clientes', icon: Users, label: 'Clientes' }, // Removed admin links from default mobile nav (can be added conditionally later)
    // { id: '/financeiro', icon: DollarSign, label: 'Finanças' },
    { id: '/menu', icon: Menu, label: 'Menu' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="backdrop-blur-xl bg-[#121212]/95 border-t border-white/10 px-2 py-3 shadow-[0_-8px_32px_0_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.id}
                className="relative flex flex-col items-center gap-1 px-4 py-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#2DD4BF]/20 border border-[#7C3AED]/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon 
                  className={`w-6 h-6 relative z-10 transition-colors ${
                    isActive ? 'text-[#7C3AED]' : 'text-white/60'
                  }`}
                />
                <span 
                  className={`text-xs relative z-10 transition-colors ${
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
