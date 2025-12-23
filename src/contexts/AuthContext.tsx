import React, { createContext, useEffect, useState } from 'react';
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log('AuthProvider: Auth state changed:', event);
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
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
