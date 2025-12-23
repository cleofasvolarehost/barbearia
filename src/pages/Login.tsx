import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { GlassCard } from '../components/GlassCard';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const checkUserRoleAndRedirect = async (userId: string, userEmail?: string) => {
    try {
        console.log('Checking role for user:', userId);
        // Try to fetch profile
        let { data: userData, error } = await supabase
            .from('usuarios')
            .select('tipo')
            .eq('id', userId)
            .single();
        
        // If profile missing or error
        if (error) {
            console.error('Error fetching role:', error);
            
            // Try to self-heal: Create profile if it might be missing
            if (error.code === 'PGRST116') { // JSON match for "Row not found"
                 console.log('Profile not found. Creating...');
                 const emailToUse = userEmail || user?.email;
                 
                 if (emailToUse) {
                     const { error: createError } = await supabase.from('usuarios').insert({
                         id: userId,
                         email: emailToUse,
                         nome: 'Usuário',
                         tipo: 'cliente'
                     });
                     
                     if (!createError) {
                         userData = { tipo: 'cliente' };
                     }
                 }
            }
        }

        const role = userData?.tipo;
        console.log('User role:', role);

         if (role === 'super_admin') {
             navigate('/super-admin/dashboard', { replace: true });
         } else if (['owner', 'barber', 'admin', 'dono', 'barbeiro'].includes(role || '')) {
             navigate('/admin/dashboard', { replace: true });
         } else {
             // For clients, go to my appointments
             navigate('/minhas-reservas', { replace: true });
         }
    } catch (err) {
        console.error('Redirect logic error:', err);
        navigate('/minhas-reservas');
    }
  };

  // Watch for auth state changes and redirect automatically
  useEffect(() => {
    if (user) {
        checkUserRoleAndRedirect(user.id, user.email);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Backdoor for development (admin/admin)
    if (formData.email === 'admin' && formData.password === 'admin') {
        localStorage.setItem('trae_dev_mode', 'true'); // Set dev flag
        toast.success('Modo Dev: Login Admin ativado!');
        navigate('/admin/dashboard');
        setLoading(false);
        return;
    }

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      
      // Check role and redirect immediately
      if (authData.user) {
          await checkUserRoleAndRedirect(authData.user.id, authData.user.email);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Erro ao realizar login');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-[#121212] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#7C3AED] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#2DD4BF] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <GlassCard className="px-8 py-10 shadow-2xl">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm mb-8 text-center">
             <div className="mx-auto h-16 w-16 bg-[#7C3AED]/20 rounded-2xl flex items-center justify-center mb-4">
                <LogIn className="h-8 w-8 text-[#7C3AED]" />
             </div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-white">
              Entre na sua conta
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Bem-vindo de volta!
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">
                Email
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-300">
                  Senha
                </label>
                <div className="text-sm">
                  <Link to="/recuperar-senha" className="font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
              </div>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-[#7C3AED] px-3 py-3 text-sm font-bold leading-6 text-white shadow-lg shadow-[#7C3AED]/25 hover:bg-[#6D28D9] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:opacity-50 items-center gap-2"
              >
                {loading ? 'Entrando...' : 'Entrar'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Não tem uma conta?{' '}
            <Link to="/cadastro" className="font-semibold leading-6 text-[#2DD4BF] hover:text-[#14B8A6] transition-colors">
              Cadastre-se agora
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
