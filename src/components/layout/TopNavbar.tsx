import { Link, useLocation } from 'react-router-dom';
import { Store, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function TopNavbar() {
  const { user } = useAuth();
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

  if (role !== 'super_admin') return null;

  return (
    <div className="w-full h-16 bg-[#121212] border-b border-white/10 flex items-center justify-end px-6 sticky top-0 z-40">
      <div>
        {activeView.startsWith('/super-admin') ? (
            <Link to="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 bg-transparent border border-purple-500 text-purple-400 rounded-full hover:bg-purple-500/10 transition-colors text-sm font-bold">
                <Store className="w-4 h-4" /> Ir para Minha Barbearia
            </Link>
        ) : (
            <Link to="/super-admin/dashboard" className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-full hover:bg-yellow-400 transition-colors text-sm font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <Crown className="w-4 h-4" /> Voltar para Super Admin
            </Link>
        )}
      </div>
    </div>
  );
}
