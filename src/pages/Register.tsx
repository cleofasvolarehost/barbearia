import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { GlassCard } from '../components/GlassCard';
import { User, Mail, Phone, Lock, UserPlus, ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
    dataNascimento: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nome: formData.nome,
            telefone: formData.telefone
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Profile is created automatically by database trigger (handle_new_user)
        
        // Send Welcome Email (Self Onboarding)
        await supabase.functions.invoke('send-email', {
            body: {
                type: 'welcome_self',
                email: formData.email,
                name: formData.nome
            }
        });

        if (authData.session) {
            toast.success('Cadastro realizado! Email de boas-vindas enviado.');
            navigate('/admin/setup');
        } else {
            // Email confirmation required
            toast.success('Cadastro realizado! Verifique seu email.');
            navigate('/login');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-[#121212] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-[#2DD4BF] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-[#7C3AED] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <GlassCard className="px-8 py-10 shadow-2xl">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm mb-8 text-center">
             <div className="mx-auto h-16 w-16 bg-[#2DD4BF]/20 rounded-2xl flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-[#2DD4BF]" />
             </div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-white">
              Crie sua conta
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Comece a agendar seus horários hoje mesmo
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nome" className="block text-sm font-medium leading-6 text-gray-300">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#2DD4BF] sm:text-sm sm:leading-6 transition-all"
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium leading-6 text-gray-300">
                Telefone <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#2DD4BF] sm:text-sm sm:leading-6 transition-all"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">
                Email <span className="text-gray-500 text-xs">(Opcional para login)</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required // Supabase Auth requires email by default, unless phone auth is enabled. Keeping required for now as primary ID.
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#2DD4BF] sm:text-sm sm:leading-6 transition-all"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
                <label htmlFor="dataNascimento" className="block text-sm font-medium leading-6 text-gray-300">
                  Data de Nascimento <span className="text-gray-500 text-xs">(Opcional)</span>
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="dataNascimento"
                    name="dataNascimento"
                    type="date"
                    className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#2DD4BF] sm:text-sm sm:leading-6 transition-all"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  />
                </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-300">
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#2DD4BF] sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium leading-6 text-gray-300">
                Confirmar Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#2DD4BF] sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-[#2DD4BF] px-3 py-3 text-sm font-bold leading-6 text-white shadow-lg shadow-[#2DD4BF]/25 hover:bg-[#14B8A6] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DD4BF] disabled:opacity-50 items-center gap-2"
              >
                {loading ? 'Criando conta...' : 'Cadastrar'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-semibold leading-6 text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
              Faça login
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
