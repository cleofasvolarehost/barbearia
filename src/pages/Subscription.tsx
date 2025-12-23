import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, Zap, Shield, Crown, AlertTriangle, ArrowRight } from 'lucide-react';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { MercadoPagoBrick } from '../components/payment/MercadoPagoBrick';

export default function Subscription() {
  const { establishment, refreshEstablishment } = useEstablishment();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'plans' | 'payment'>('plans');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setPaymentStep('payment');
  };

  const handleBrickSuccess = async (token: string, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => {
    setLoading(true);
    try {
        if (!establishment || !selectedPlanId || !user?.email) return;

        // Call Edge Function to create subscription
        const response = await fetch('https://vkobtnufnijptgvvxrhq.supabase.co/functions/v1/create-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                token,
                payer_email: user.email,
                plan_id: selectedPlanId, // Changed from plan_type to plan_id
                issuer_id,
                payment_method_id,
                card_holder_name,
                identification
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao processar assinatura');
        }

        toast.success(`Assinatura iniciada com sucesso!`);
        
        setTimeout(() => refreshEstablishment(), 2000);
        
        setPaymentStep('plans');
        setSelectedPlanId(null);

    } catch (error: any) {
        console.error('Subscription error:', error);
        toast.error(`Erro: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleBrickError = (error: any) => {
      console.error('Brick Error:', error);
      const msg = typeof error === 'string' ? error : 'Erro no processamento do cartão. Tente novamente.';
      toast.error(msg);
  };

  const isExpired = establishment?.subscription_end_date && new Date(establishment.subscription_end_date) < new Date();
  const daysRemaining = establishment?.subscription_end_date 
    ? Math.ceil((new Date(establishment.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const getPeriodLabel = (days: number) => {
    if (days === 30) return 'mês';
    if (days === 90) return '3 meses';
    if (days === 180) return '6 meses';
    if (days === 365) return 'ano';
    return `${days} dias`;
  };

  if (paymentStep === 'payment' && selectedPlanId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      return (
        <div className="min-h-screen bg-[#121212] text-white p-4 md:p-8 flex flex-col items-center justify-center">
            <div className="max-w-md w-full">
                <button 
                    onClick={() => setPaymentStep('plans')}
                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" /> Voltar aos planos
                </button>

                <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Finalizar Assinatura</h2>
                        <p className="text-gray-400">
                            Plano <span className="text-[#7C3AED] font-bold">{plan?.name}</span> - R$ {plan?.price}
                        </p>
                    </div>

                    <MercadoPagoBrick 
                        amount={plan?.price || 0}
                        email={user?.email || ''}
                        onSuccess={handleBrickSuccess}
                        onError={handleBrickError}
                    />
                    
                    <p className="text-xs text-center text-gray-500 mt-6">
                        Ambiente Seguro Mercado Pago. Seus dados são criptografados.
                    </p>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)]"
          >
            <Crown className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Assinatura <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">CyberSalon</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Mantenha seu acesso ao sistema de gestão mais avançado do mercado.
          </p>
        </div>

        {/* Current Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-12 p-6 rounded-3xl border ${isExpired ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'} backdrop-blur-xl`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpired ? 'bg-red-500/20 text-red-500' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
                {isExpired ? <AlertTriangle className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                    {isExpired ? 'Assinatura Expirada' : 'Assinatura Ativa'}
                </h2>
                <p className="text-sm text-gray-400">
                    {isExpired 
                        ? 'Renove agora para recuperar o acesso total.' 
                        : `Vence em ${daysRemaining} dias (${new Date(establishment?.subscription_end_date!).toLocaleDateString()})`
                    }
                </p>
              </div>
            </div>
            
            {!isExpired && (
                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-mono">
                    Plano Atual: <span className="text-[#2DD4BF] font-bold uppercase">{establishment?.subscription_plan || 'Trial'}</span>
                </div>
            )}
          </div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl border flex flex-col ${
                plan.is_recommended
                  ? 'bg-gradient-to-b from-[#7C3AED]/10 to-transparent border-[#7C3AED] shadow-2xl shadow-[#7C3AED]/20 scale-105 z-10'
                  : 'bg-white/5 backdrop-blur border-white/10 hover:bg-white/10'
              }`}
            >
              {plan.is_recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-sm font-bold shadow-lg">
                  Mais Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-400">R$</span>
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-400">/{getPeriodLabel(plan.interval_days)}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {Array.isArray(plan.features) && plan.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <Check className="w-5 h-5 text-[#2DD4BF] flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  plan.is_recommended
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-lg hover:shadow-[#7C3AED]/50 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Escolher {plan.name} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ / Trust */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <h3 className="font-bold mb-1">Ativação Imediata</h3>
                <p className="text-sm text-gray-400">Acesso liberado assim que o pagamento for confirmado.</p>
            </div>
            <div className="p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#2DD4BF]" />
                </div>
                <h3 className="font-bold mb-1">Pagamento Seguro</h3>
                <p className="text-sm text-gray-400">Processado via Mercado Pago com criptografia de ponta.</p>
            </div>
            <div className="p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-bold mb-1">Garantia de 7 Dias</h3>
                <p className="text-sm text-gray-400">Satisfação garantida ou seu dinheiro de volta.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
