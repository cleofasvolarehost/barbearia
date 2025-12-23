import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { GlassCard } from '../components/GlassCard';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a session (user is logged in via the recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Link de recuperação inválido ou expirado.');
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    } catch (error: any) {
      console.error('Update password error:', error);
      toast.error(error.message || 'Erro ao atualizar senha');
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
                <Lock className="h-8 w-8 text-[#7C3AED]" />
             </div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-white">
              Nova Senha
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Defina sua nova senha de acesso.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-300">
                Nova Senha
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 pr-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-300">
                Confirmar Nova Senha
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-[#7C3AED] px-3 py-3 text-sm font-bold leading-6 text-white shadow-lg shadow-[#7C3AED]/25 hover:bg-[#6D28D9] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:opacity-50 items-center gap-2"
              >
                {loading ? 'Salvando...' : 'Redefinir Senha'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
