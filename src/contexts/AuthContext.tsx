import React, { createContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:20',message:'AuthProvider render start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const [session, setSession] = useState<Session | null>(null);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:21',message:'useState session called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const [user, setUser] = useState<User | null>(null);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:22',message:'useState user called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const [loading, setLoading] = useState(true);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:23',message:'useState loading called',data:{loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  useEffect(() => {
    let mounted = true;
    console.log('AuthProvider: Initializing...');

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthProvider: Auth check timed out. Forcing load completion.');
        setLoading(false);
      }
    }, 3000); // 3 seconds timeout

    const initAuth = async () => {
      try {
        console.log('AuthProvider: Fetching session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
        } else {
          console.log('AuthProvider: Session fetched', session ? 'User found' : 'No user');
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('AuthProvider: Unexpected error during auth init:', err);
      } finally {
        if (mounted) {
          console.log('AuthProvider: Auth init finished');
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    initAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'TOKEN_REFRESHED') {
         console.log('AuthProvider: Auth state changed:', event);
      }
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo(() => ({
    session,
    user,
    loading,
    signOut
  }), [session, user, loading]);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:88',message:'useMemo value called',data:{loading,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/38f7e906-e821-443a-ac76-c0604c083a83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:95',message:'Before conditional return check',data:{loading,willReturnEarly:loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#121212] gap-6">
        <div className="relative">
            {/* Outer Ring */}
            <div className="w-16 h-16 rounded-full border-4 border-[#7C3AED]/30 border-t-[#7C3AED] animate-spin"></div>
            
            {/* Inner Scissor/Icon (Optional - simplified for CSS only) */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
            </div>
        </div>
        <div className="flex flex-col items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-wider">CYBER<span className="text-[#7C3AED]">SALON</span></h3>
            <p className="text-gray-400 text-sm animate-pulse">Preparando seu estilo...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
