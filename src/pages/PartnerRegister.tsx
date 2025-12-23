import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { GlassCard } from '../components/GlassCard';
import { User, Mail, Phone, Lock, Briefcase, ArrowRight, Store } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PartnerRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    shopName: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up user with 'owner' metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nome: formData.nome,
            telefone: formData.telefone,
            tipo: 'owner', // Explicitly set role
            shop_name_initial: formData.shopName // Pass shop name for trigger or manual setup
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Force update profile to 'owner' just in case trigger defaulted to client
        // This is a safety measure. The trigger handles new users, but we want to be sure.
        // Also, we might want to pre-create the establishment in 'admin/setup' using shopName.
        // We can store shopName in localStorage to use in /admin/setup
        localStorage.setItem('temp_shop_name', formData.shopName);

        // Update role manually to be safe (if RLS allows update on own profile)
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ tipo: 'owner' })
            .eq('id', authData.user.id);
        
        if (updateError) {
            console.warn('Failed to force update role to owner, hoping trigger worked or user can setup later', updateError);
        }

        if (authData.session) {
            toast.success('Conta de parceiro criada!');
            navigate('/admin/setup');
        } else {
            // Email confirmation required
            toast.success('Cadastro realizado! Verifique seu email para confirmar.');
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
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-[#7C3AED] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-[#2DD4BF] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <GlassCard className="px-8 py-10 shadow-2xl border-[#7C3AED]/30">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm mb-8 text-center">
             <div className="mx-auto h-16 w-16 bg-[#7C3AED]/20 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-[#7C3AED]" />
             </div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-white">
              Seja um Parceiro CyberBarber
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Gerencie sua barbearia com tecnologia de ponta
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nome" className="block text-sm font-medium leading-6 text-gray-300">
                Nome do Responsável
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
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="shopName" className="block text-sm font-medium leading-6 text-gray-300">
                Nome da Barbearia
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="shopName"
                  name="shopName"
                  type="text"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="Ex: Navalha de Ouro"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium leading-6 text-gray-300">
                Telefone / WhatsApp
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
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">
                Email Corporativo
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
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                  placeholder="admin@suabarbearia.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
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
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
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
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] px-3 py-3 text-sm font-bold leading-6 text-white shadow-lg shadow-[#7C3AED]/25 hover:shadow-xl hover:shadow-[#7C3AED]/40 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:opacity-50 items-center gap-2"
              >
                {loading ? 'Criando conta...' : 'Cadastrar Barbearia'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-semibold leading-6 text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
              Acesse o Painel
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
