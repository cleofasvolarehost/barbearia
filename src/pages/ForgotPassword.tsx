import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { GlassCard } from '../components/GlassCard';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);
    setDebugInfo(null);

    try {
      // 1. Try via Edge Function (Manual Resend) - USING DIRECT FETCH
      console.log('Tentando Edge Function (Direct Fetch)...');
      
      const functionUrl = 'https://vkobtnufnijptgvvxrhq.supabase.co/functions/v1/forgot-password';
      
      try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` // Optional for public functions usually
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Erro HTTP: ${response.status}`);
        }

        setSent(true);
        toast.success('Email de recuperação enviado!');
        return;

      } catch (err: any) {
        console.warn('Edge Function Direct Fetch failed:', err);
        setDebugInfo(`Fetch Error: ${err.message}`);
        // Continue to fallback...
      }

      // 2. Fallback (Only if function fails)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      // Translate common errors
      let errorMessage = 'Erro ao enviar email de recuperação';
      
      console.warn('--- SUPABASE ERROR DIAGNOSTIC ---');
      console.warn('1. Check if "http://localhost:5173/reset-password" is added to Authentication > URL Configuration > Redirect URLs in Supabase Dashboard.');
      console.warn('2. Check Authentication > Rate Limits. Free tier allows ~3 emails/hour.');
      console.warn('3. Verify if your SMTP settings are correct (if Custom SMTP is enabled).');
      console.warn('-----------------------------------');

      if (error.message?.includes('rate limit')) {
          errorMessage = 'Muitas tentativas. Aguarde um momento.';
      } else if (error.status === 429) {
          errorMessage = 'Muitas tentativas. Aguarde um momento.';
      } else if (error.message?.includes('User not found')) {
          errorMessage = 'Email não cadastrado.';
      } else if (error.message?.includes('Error sending recovery email')) {
          errorMessage = 'Erro no servidor de email (Rate Limit ou Configuração).';
          setLastError('config_error');
      }

      toast.error(errorMessage);
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
                <Mail className="h-8 w-8 text-[#7C3AED]" />
             </div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-white">
              Recuperar Senha
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Digite seu email para receber o link de redefinição.
            </p>
          </div>

          {!sent ? (
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
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-xl border-0 py-3 pl-10 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6 transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl bg-[#7C3AED] px-3 py-3 text-sm font-bold leading-6 text-white shadow-lg shadow-[#7C3AED]/25 hover:bg-[#6D28D9] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:opacity-50 items-center gap-2"
                >
                  {loading ? 'Enviando...' : 'Enviar Link'} <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
                <div className="bg-green-500/10 text-green-400 p-4 rounded-xl mb-6 border border-green-500/20">
                    <p className="font-semibold">Email enviado com sucesso!</p>
                    <p className="text-sm mt-1">Verifique sua caixa de entrada (e spam) para redefinir sua senha.</p>
                </div>
            </div>
          )}

          {lastError === 'config_error' && (
             <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-left">
                <h4 className="text-yellow-500 font-bold text-sm mb-2 flex items-center gap-2">
                    ⚠️ Diagnóstico de Erro (Supabase)
                </h4>
                <ul className="list-disc pl-4 text-xs text-gray-400 space-y-2">
                    <li>
                        <strong>Rate Limit / SMTP:</strong> Verifique <em>Authentication &gt; Rate Limits</em> ou se o SMTP Customizado está configurado (obrigatório para alta escala).
                    </li>
                    <li>
                        <strong>Redirect URL:</strong> Verifique se <code>{window.location.origin}/reset-password</code> está adicionado em <em>Authentication &gt; URL Configuration</em> no painel do Supabase.
                    </li>
                </ul>
             </div>
          )}

          <p className="mt-10 text-center text-sm text-gray-500">
            <Link to="/login" className="font-semibold leading-6 text-[#2DD4BF] hover:text-[#14B8A6] transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar para o Login
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
