import { Link, useLocation } from 'react-router-dom';
import { Store, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function TopNavbar() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopNavbar.tsx:7',message:'TopNavbar render start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const { user } = useAuth();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopNavbar.tsx:8',message:'TopNavbar useAuth called',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const location = useLocation();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopNavbar.tsx:9',message:'TopNavbar useLocation called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const activeView = location.pathname;
  const [role, setRole] = useState<string | null>(null);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopNavbar.tsx:11',message:'TopNavbar useState role called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
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
    }
  }, [user]);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopNavbar.tsx:24',message:'TopNavbar useEffect called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopNavbar.tsx:26',message:'TopNavbar before conditional return',data:{role,willReturnNull:role !== 'super_admin'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
