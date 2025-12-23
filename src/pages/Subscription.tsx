import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, Zap, Shield, Crown, AlertTriangle, ArrowRight, Calendar, CreditCard, XCircle, Clock } from 'lucide-react';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { SubscriptionController } from '../components/subscription/SubscriptionController';
import { Tab } from '../components/modals/SubscriptionManagerModal';

export default function Subscription() {
  const { establishment, refreshEstablishment } = useEstablishment();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<Tab>('plans');
  const [cancelling, setCancelling] = useState(false);

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
      
      const formattedPlans = (data || []).map(p => ({
          ...p,
          price: Number(p.price).toFixed(2),
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    }
  };

  const handleSelectPlan = (plan: any) => {
    setManagerTab('plans');
    setIsManagerOpen(true);
  };

  const handlePaymentSuccess = async () => {
      await refreshEstablishment();
      toast.success('Assinatura atualizada com sucesso!');
  };

  const handleCancelSubscription = async () => {
      if (!establishment) return;
      if (!window.confirm('Tem certeza que deseja cancelar a renovação automática? Você continuará com acesso até o fim do período atual.')) {
          return;
      }

      setCancelling(true);
      try {
          const { data, error } = await supabase.functions.invoke('manage-subscription', {
              body: {
                  action: 'cancel',
                  establishment_id: establishment.id
              }
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          toast.success('Assinatura cancelada com sucesso.');
          await refreshEstablishment();
      } catch (error: any) {
          console.error('Error cancelling:', error);
          toast.error(error.message || 'Erro ao cancelar assinatura');
      } finally {
          setCancelling(false);
      }
  };

  const isExpired = establishment?.subscription_end_date && new Date(establishment.subscription_end_date) < new Date();
  const isActive = establishment?.subscription_status === 'active';
  const isCancelled = establishment?.subscription_status === 'cancelled';
  
  const daysRemaining = establishment?.subscription_end_date 
    ? Math.ceil((new Date(establishment.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const endDateFormatted = establishment?.subscription_end_date 
    ? new Date(establishment.subscription_end_date).toLocaleDateString()
    : '-';

  const scrollToPlans = () => {
    const plansSection = document.getElementById('plans-section');
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Flash effect or visual cue could be added here
      const cards = document.querySelectorAll('.plan-card');
      cards.forEach(card => {
        card.classList.add('ring-2', 'ring-[#7C3AED]');
        setTimeout(() => card.classList.remove('ring-2', 'ring-[#7C3AED]'), 1000);
      });
    }
  };

  const getPeriodLabel = (days: number) => {
    if (days === 30) return 'mês';
    if (days === 90) return '3 meses';
    if (days === 180) return '6 meses';
    if (days === 365) return 'ano';
    return `${days} dias`;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-8 pb-32">
      <SubscriptionController 
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        plans={plans}
        onSuccess={handlePaymentSuccess}
        initialTab={managerTab}
      />

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
            Gerencie seu plano e mantenha seu acesso ao sistema.
          </p>
        </div>

        {/* Active Subscription Management Card */}
        {isActive && !isExpired && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 bg-[#1E1E1E] border border-white/10 rounded-3xl overflow-hidden relative"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]"></div>
                <div className="p-8 grid md:grid-cols-3 gap-8 items-center">
                    
                    {/* Status Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Assinatura Ativa</h2>
                                <p className="text-sm text-gray-400">Plano {establishment?.subscription_plan || 'Premium'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 p-3 rounded-xl">
                            <Calendar className="w-4 h-4 text-[#7C3AED]" />
                            <span>Renova em: <strong>{endDateFormatted}</strong></span>
                        </div>
                    </div>

                    {/* Usage/Details */}
                    <div className="space-y-2 text-center md:text-left">
                        <div className="text-sm text-gray-400">Dias Restantes</div>
                        <div className="text-4xl font-black text-white">{daysRemaining}</div>
                        <div className="text-xs text-green-400 font-bold uppercase tracking-wider">Acesso Total Liberado</div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => { setManagerTab('renew'); setIsManagerOpen(true); }}
                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold flex items-center justify-center gap-2 transition-colors group"
                        >
                            <CreditCard className="w-4 h-4 group-hover:text-[#7C3AED] transition-colors" />
                            Renovar / Mudar Pagamento
                        </button>
                        
                        <button 
                            onClick={handleCancelSubscription}
                            disabled={cancelling}
                            className="w-full py-3 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {cancelling ? 'Processando...' : (
                                <>
                                    <XCircle className="w-4 h-4" /> Cancelar Assinatura
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        )}

        {/* Cancelled/Expired Status Card */}
        {(isCancelled || isExpired) && (
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-12 p-6 rounded-3xl border ${isExpired ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'} backdrop-blur-xl`}
             >
                 <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpired ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                         <AlertTriangle className="w-6 h-6" />
                     </div>
                     <div>
                         <h2 className="text-xl font-bold">
                             {isExpired ? 'Assinatura Expirada' : 'Renovação Cancelada'}
                         </h2>
                         <p className="text-sm text-gray-300">
                             {isExpired 
                                 ? 'Renove agora para recuperar o acesso total ao sistema.' 
                                 : `Seu acesso continua disponível até ${endDateFormatted}. Após essa data, você precisará renovar.`
                             }
                         </p>
                     </div>
                 </div>
             </motion.div>
        )}

        {/* Plans Section Title */}
        <div id="plans-section" className="flex items-center justify-between mb-8 mt-16 border-t border-white/10 pt-16">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Planos Disponíveis</h2>
                <p className="text-gray-400 text-sm">Escolha o melhor ciclo para o seu negócio</p>
            </div>
            {isActive && (
                <span className="text-xs font-bold bg-[#7C3AED]/20 text-[#7C3AED] px-3 py-1 rounded-full">
                    Mudar Ciclo
                </span>
            )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
             const isCurrentPlan = establishment?.subscription_plan === plan.name && !isExpired;
             
             return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`plan-card relative p-8 rounded-3xl border flex flex-col transition-all duration-300 ${
                plan.is_recommended
                  ? 'bg-gradient-to-b from-[#7C3AED]/10 to-transparent border-[#7C3AED] shadow-2xl shadow-[#7C3AED]/20 scale-105 z-10'
                  : 'bg-white/5 backdrop-blur border-white/10 hover:bg-white/10'
              } ${isCurrentPlan ? 'ring-2 ring-green-500 border-green-500 bg-green-500/5' : ''}`}
            >
              {plan.is_recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-sm font-bold shadow-lg">
                  Mais Popular
                </div>
              )}
              
              {isCurrentPlan && (
                  <div className="absolute top-4 right-4 text-green-500 flex items-center gap-1 text-xs font-bold uppercase">
                      <Check className="w-4 h-4" /> Atual
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
                onClick={() => handleSelectPlan(plan)}
                // Allow clicking even if it's current plan, to renew or change payment method
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isCurrentPlan && isActive
                    ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                    : plan.is_recommended
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-lg hover:shadow-[#7C3AED]/50 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isCurrentPlan && isActive ? (
                    <>
                        <CreditCard className="w-4 h-4" /> Renovar / Alterar Pagamento
                    </>
                ) : (
                    <>
                        {isActive ? 'Mudar para ' : 'Escolher '} {plan.name} <ArrowRight className="w-4 h-4" />
                    </>
                )}
              </button>
            </motion.div>
          )})}
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
