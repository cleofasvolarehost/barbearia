import { Bell, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function MobileHeader() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MobileHeader.tsx:4',message:'MobileHeader render start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const { user } = useAuth();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MobileHeader.tsx:5',message:'MobileHeader useAuth called',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#121212]/80 backdrop-blur-md border-b border-white/5 px-4 h-16 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold tracking-tight">CyberBarber</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-white/60 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#121212]"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 border border-white/10 overflow-hidden">
           {user?.user_metadata?.avatar_url ? (
               <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
           ) : (
               <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                   {user?.email?.charAt(0).toUpperCase()}
               </div>
           )}
        </div>
      </div>
    </div>
  );
}
