import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, CreditCard, User, Mail, Phone, ChevronDown, ChevronUp, Check, Zap, Calendar, Loader2, AlertTriangle, Copy } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { MercadoPagoBrick } from '../../components/payment/MercadoPagoBrick';
import { toast } from 'react-hot-toast';

type PaymentMethod = 'pix' | 'credit';

import { useEstablishment } from '../../contexts/EstablishmentContext';

export default function FastCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { establishment, refreshEstablishment } = useEstablishment();
  
  // Guard: If already active, go straight to admin dashboard
  useEffect(() => {
    if (user && establishment?.subscription_status === 'active') {
        navigate('/admin/dashboard', { replace: true });
    }
  }, [user, establishment, navigate]);
  
  const planId = searchParams.get('plan');
  
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [expandedMethod, setExpandedMethod] = useState<PaymentMethod>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; ticket_url?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [recurring, setRecurring] = useState(true);

  // Preload Mercado Pago SDK early to speed up card form
  useEffect(() => {
    if (document.getElementById('mp-sdk')) return;
    const script = document.createElement('script');
    script.id = 'mp-sdk';
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '', // New for guest checkout
  });

  // Pre-fill if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.user_metadata?.name || '',
        phone: user.user_metadata?.phone || ''
      }));
    }
  }, [user]);

  // Fetch Plan
  useEffect(() => {
    async function fetchPlan() {
      if (!planId) {
        setLoadingPlan(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('saas_plans')
          .select('*')
          .eq('id', planId) // Assuming ID or Slug
          .single();
          
        // If not found by ID, try by name/slug logic if you have that setup
        // For now assuming ID or direct lookup
        if (error) {
             // Fallback lookup by name if needed, or handle error
             console.error('Plan not found', error);
        } else {
            setPlan(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPlan(false);
      }
    }
    fetchPlan();
  }, [planId]);

  const planPrice = plan ? Number(plan.price) : 0;
  const pixDiscount = 0; // Configurable
  const pixPrice = planPrice * (1 - pixDiscount / 100);

  const toggleMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setExpandedMethod(method);
  };

  const handleBrickSuccess = async (token: string | undefined, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => {
    setIsProcessing(true);
    try {
        let response;
        
        if (user) {
            // Existing User Flow (Create Subscription / Reactivate)
            response = await supabase.functions.invoke('create-subscription', {
                body: {
                    token,
                    issuer_id,
                    payment_method_id,
                    card_holder_name,
                    identification,
                    payer_email: user.email,
                    establishment_id: establishment?.id, // Might be null if user has account but no establishment yet
                    plan_id: plan?.id,
                    custom_amount: planPrice,
                    type: 'new_subscription',
                    description: `Assinatura ${plan?.name}`,
                    recurring: selectedMethod === 'credit' ? recurring : false
                }
            });
        } else {
            // New Guest Flow (Acquire Customer)
            response = await supabase.functions.invoke('acquire-customer', {
                body: {
                    token,
                    issuer_id,
                    payment_method_id,
                    card_holder_name,
                    identification,
                    payer_email: formData.email,
                    plan_id: plan?.id,
                    user_data: {
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password
                    },
                    type: 'new_subscription_fast_track',
                    recurring: selectedMethod === 'credit' ? recurring : false
                }
            });
        }

        const { data, error } = response;

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // 3. Success Flow
        setShowSuccess(true);
        try {
          await refreshEstablishment();
        } catch {}
        setTimeout(() => {
          if (user) {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/setup/welcome', { replace: true });
          }
        }, 1500);

    } catch (error: any) {
        console.error('Checkout Error:', error);
        toast.error(error.message || 'Erro ao processar pagamento');
        
        // Save Lead logic could be here if we want to separate it from the atomic function
        // But optimally the Edge Function handles the "Lead" creation on failure internally
    } finally {
        setIsProcessing(false);
    }
  };

  const handleGeneratePix = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          payer_email: (user?.email || formData.email),
          establishment_id: establishment?.id,
          plan_id: plan?.id,
          custom_amount: planPrice,
          type: 'new_subscription',
          description: `Assinatura ${plan?.name}`,
          payment_method_id: 'pix'
        }
      });
      if (error) throw error;
      const qrCode = data?.qr_code || data?.point_of_interaction?.transaction_data?.qr_code;
      const qrBase64 = data?.qr_code_base64 || data?.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = data?.ticket_url || data?.point_of_interaction?.transaction_data?.ticket_url;
      if (qrCode && qrBase64) {
        setPixData({ qr_code: qrCode, qr_code_base64: qrBase64, ticket_url: ticketUrl });
        toast.success('PIX gerado com sucesso!');
      } else {
        toast.error('Falha ao gerar QR Pix');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar PIX');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCopyPix = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // If loading plan
  if (loadingPlan) {
      return (
          <div className="min-h-screen bg-[#050505] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
          </div>
      );
  }

  // If no plan found
  if (!plan && !loadingPlan) {
      return (
          <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold">Plano não encontrado</h2>
              <button onClick={() => navigate('/')} className="mt-4 text-[#7C3AED]">Voltar ao início</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* HEADER - Trust Anchor */}
      <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#10B981] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-black">CyberSalon</span>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30">
              <Lock className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-xs font-bold text-[#10B981]">Ambiente Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-md mx-auto px-6 py-8 pb-40">
        {/* THE "HERO" PRODUCT CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative p-6 rounded-3xl bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-white/10 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/5 to-[#10B981]/5" />
            
            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700]/50 mb-4">
                <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                <span className="text-xs font-black text-[#FFD700]">7 DIAS DE GARANTIA</span>
              </div>

              {/* Plan Name */}
              <h2 className="text-2xl font-black text-white mb-2">{plan.name}</h2>
              
              {/* Benefits List (Dynamic or Static fallback) */}
              <ul className="space-y-2 mb-5">
                {(plan.features || [
                  'Agendamento ilimitado',
                  'Dashboard analytics completo',
                  'Marketing & Fidelidade',
                  'Suporte prioritário 24/7',
                ]).map((benefit: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#10B981]" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#10B981]">
                    R$ {planPrice.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-400 pb-2">/{plan.interval_days === 30 ? 'mês' : 'ano'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cobrado {plan.interval_days === 30 ? 'mensalmente' : 'anualmente'} • Cancele quando quiser</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAST INPUTS (The Form) */}
        {!user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Seus Dados</h3>
            
            <div className="space-y-3">
              {/* Name */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>

               {/* Password (Simplified for Guest Checkout) */}
               <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="password"
                  placeholder="Crie uma senha segura"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>
            </div>
          </motion.div>
        ) : (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-[#1A1A1A] p-6 rounded-2xl border border-white/10"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center font-bold text-xl">
                        {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Logado como</p>
                        <p className="font-bold text-white text-lg">{user.user_metadata?.name || user.email}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                </div>
            </motion.div>
        )}

        {/* PAYMENT SELECTOR */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Pagamento</h3>

          {/* We reuse the MercadoPagoBrick but style it or wrap it to match the OnePage feel */}
          {/* Or we manually build the UI if we want custom look like the example. 
              For "Instant" implementation, using the Brick is safer and faster for backend integration.
              The provided OnePageCheckout example had manual card fields which requires tokenizer.
              MercadoPagoBrick handles tokenization automatically.
          */}
          
          <div className="bg-[#1E1E1E] p-4 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSelectedMethod('pix')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedMethod === 'pix'
                    ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Pix
              </button>
              <button
                onClick={() => setSelectedMethod('credit')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedMethod === 'credit'
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Cartão de Crédito
              </button>
            </div>
            {selectedMethod === 'pix' ? (
              <div className="space-y-4">
                {!pixData ? (
                  <button
                    onClick={handleGeneratePix}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-[#10B981] text-black font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {isProcessing ? 'Gerando PIX...' : 'Gerar QR PIX'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl">
                      <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Pix" className="w-48 h-48 mx-auto" />
                    </div>
                    <div className="space-y-3">
                      <div className="text-center text-xs text-gray-500">Escaneie o QR Code ou copie o código</div>
                      <div className="relative group">
                        <div className="w-full bg-black/30 border border-white/10 rounded-xl p-4 pr-14 text-[11px] text-gray-300 font-mono leading-relaxed break-all max-h-36 overflow-y-auto custom-scrollbar-hidden shadow-inner">
                          {pixData.qr_code}
                        </div>
                        <button
                          onClick={handleCopyPix}
                          className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-[#7C3AED]/30"
                          title="Copiar código PIX"
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-500 space-y-1">
                        <p>Use a opção <span className="font-bold text-white">Pix Copia e Cola</span> no seu banco. Não cole na opção "Chave Pix".</p>
                        {pixData.ticket_url && (
                          <a href={pixData.ticket_url} target="_blank" className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white">Abrir link do pagamento</a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <MercadoPagoBrick
                  brickMode="cardPayment"
                  amount={planPrice}
                  email={formData.email}
                  paymentType={'credit_card'}
                  onSuccess={handleBrickSuccess}
                  onError={(err) => {
                    const msg = typeof err === 'string' ? err : (err?.message || 'Erro no pagamento');
                    toast.error(msg);
                  }}
                  customization={{
                    visual: {
                       style: { theme: 'default' },
                      hidePaymentButton: false
                    }
                  }}
                />
                <div className="mt-4 flex items-center gap-3">
                  <input 
                    id="recurringToggle"
                    type="checkbox" 
                    checked={recurring} 
                    onChange={(e) => setRecurring(e.target.checked)} 
                    className="w-5 h-5 rounded-md border border-white/20 bg-white/5"
                  />
                  <label htmlFor="recurringToggle" className="text-sm text-gray-300">
                    Cobrança automática mensal no cartão
                  </label>
                </div>
              </>
            )}
          </div>

        </motion.div>
        <style>{`
          .custom-scrollbar-hidden { scrollbar-width: none; -ms-overflow-style: none; }
          .custom-scrollbar-hidden::-webkit-scrollbar { width: 0; height: 0; }
        `}</style>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-4 text-xs text-gray-600"
        >
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            <span>SSL 256-bit</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-700" />
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PCI Compliant</span>
          </div>
        </motion.div>
      </main>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    '0 0 40px rgba(16, 185, 129, 0.6)',
                    '0 0 80px rgba(16, 185, 129, 1)',
                    '0 0 40px rgba(16, 185, 129, 0.6)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center"
              >
                <Check className="w-16 h-16 text-white" strokeWidth={3} />
              </motion.div>

              <h2 className="text-4xl font-black text-white mb-3">Bem-vindo ao Pro!</h2>
              <p className="text-lg text-gray-400 mb-6">Seu acesso foi liberado</p>

              {/* Particles */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 600,
                    y: (Math.random() - 0.5) * 600,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{ duration: 2, delay: i * 0.02 }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: ['#10B981', '#7C3AED', '#FFD700'][i % 3],
                    left: '50%',
                    top: '40%',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
