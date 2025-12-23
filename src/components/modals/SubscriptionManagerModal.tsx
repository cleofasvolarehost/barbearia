import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CreditCard, Calendar, ArrowRight, Check, Shield, 
  TrendingUp, TrendingDown, Clock, AlertTriangle, Loader2 
} from 'lucide-react';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MercadoPagoBrick } from '../payment/MercadoPagoBrick';

interface SubscriptionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
  onSuccess: () => void;
  initialTab?: Tab;
}

type Tab = 'plans' | 'renew' | 'payment';

export function SubscriptionManagerModal({ isOpen, onClose, plans, onSuccess, initialTab = 'plans' }: SubscriptionManagerModalProps) {
  const { establishment, refreshEstablishment } = useEstablishment();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'checkout'>('selection');
  
  // Payment State
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentType, setPaymentType] = useState<'upgrade' | 'renewal'>('renewal');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPaymentStep('selection');
      setSelectedPlan(null);
    }
  }, [isOpen, initialTab]);

  const currentPlan = plans.find(p => p.name === establishment?.subscription_plan);
  const currentPrice = currentPlan ? Number(currentPlan.price) : 0;
  
  const endDateFormatted = establishment?.subscription_end_date 
    ? new Date(establishment.subscription_end_date).toLocaleDateString()
    : '-';
    
  const isExpired = establishment?.subscription_end_date && new Date(establishment.subscription_end_date) < new Date();

  // Logic for Plan Switching
  const handleSelectPlan = (plan: any) => {
    const planPrice = Number(plan.price);

    if (planPrice > currentPrice) {
      // Upgrade or New Subscription
      const diff = planPrice - currentPrice;
      // Simple pro-rata logic (mocked for now, just paying difference)
      setAmountToPay(diff > 0 ? diff : planPrice); 
      setPaymentDescription(currentPrice > 0 ? `Upgrade para ${plan.name}` : `Assinatura ${plan.name}`);
      setPaymentType('upgrade');
      setSelectedPlan(plan);
      setPaymentStep('checkout');
    } else if (planPrice < currentPrice) {
      // Downgrade
      if (confirm(`Seu plano mudará para ${plan.name} no fim do ciclo atual. Deseja confirmar?`)) {
        handleDowngrade(plan);
      }
    } else {
      toast('Você já está neste plano.', { icon: 'ℹ️' });
    }
  };

  const handleDowngrade = async (plan: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'downgrade',
          establishment_id: establishment?.id,
          new_plan_id: plan.id
        }
      });

      if (error) throw error;
      
      toast.success(`Downgrade agendado para ${plan.name}`);
      onClose();
    } catch (error: any) {
      console.error('Error downgrading:', error);
      toast.error('Erro ao agendar troca de plano');
    } finally {
      setLoading(false);
    }
  };

  // Logic for Early Renewal
  const handleRenewalOption = (months: number, discountPercent: number) => {
    // If no current plan, maybe select the first one or ask to select plan
    if (!currentPlan) {
        toast.error('Selecione um plano primeiro.');
        setActiveTab('plans');
        return;
    }
    
    const basePrice = Number(currentPlan.price);
    const total = basePrice * months;
    const discounted = total * (1 - discountPercent / 100);
    
    setAmountToPay(discounted);
    setPaymentDescription(`Renovação Antecipada (+${months} meses)`);
    setPaymentType('renewal');
    setSelectedPlan(currentPlan); // Renewal is on current plan
    setPaymentStep('checkout');
  };

  const handleBrickSuccess = async (token: string | undefined, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => {
    setLoading(true);
    try {
        const response = await fetch('https://vkobtnufnijptgvvxrhq.supabase.co/functions/v1/create-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                token,
                payer_email: user?.email,
                establishment_id: establishment?.id,
                plan_id: selectedPlan?.id,
                issuer_id,
                payment_method_id,
                card_holder_name,
                identification,
                // Custom fields for logic
                custom_amount: amountToPay,
                type: paymentType,
                description: paymentDescription,
                days_to_add: paymentType === 'renewal' ? 
                    (paymentDescription.includes('+1 Mês') ? 30 : 
                     paymentDescription.includes('+3 Meses') ? 90 : 
                     paymentDescription.includes('+1 Ano') ? 365 : 30) : undefined
            })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Erro no pagamento');

        if (data.status === 'approved') {
            toast.success('Pagamento confirmado!');
            await onSuccess();
            onClose();
        } else {
             toast('Pagamento processado. Aguardando confirmação.', { icon: '⏳' });
             onClose();
        }

    } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row h-[600px] shadow-2xl"
      >
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-[#111] border-r border-white/5 p-6 flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white mb-6 px-2">Gerenciar Assinatura</h2>
          
          <button 
            onClick={() => { setActiveTab('plans'); setPaymentStep('selection'); }}
            className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <TrendingUp className="w-4 h-4" /> Meu Plano & Trocas
          </button>

          <button 
            onClick={() => { setActiveTab('renew'); setPaymentStep('selection'); }}
            className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'renew' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Clock className="w-4 h-4" /> Antecipar Renovação
          </button>

          <button 
            onClick={() => { setActiveTab('payment'); setPaymentStep('selection'); }}
            className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'payment' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <CreditCard className="w-4 h-4" /> Carteira & Pagamento
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white rounded-full z-10">
            <X className="w-6 h-6" />
          </button>

          <div className="p-8">
            
            {paymentStep === 'checkout' ? (
              <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
                <button 
                    onClick={() => setPaymentStep('selection')}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" /> Voltar
                </button>

                <h2 className="text-2xl font-bold mb-2">Confirmar Pagamento</h2>
                <p className="text-gray-400 mb-6">{paymentDescription}</p>

                <div className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/10 mb-6 flex justify-between items-center">
                    <span className="text-gray-300">Total a pagar</span>
                    <span className="text-2xl font-bold text-[#10B981]">R$ {amountToPay.toFixed(2)}</span>
                </div>

                <MercadoPagoBrick 
                    amount={amountToPay}
                    email={user?.email || ''}
                    onSuccess={handleBrickSuccess}
                    onError={(err) => toast.error('Erro no pagamento')}
                    customization={{
                        visual: {
                            style: { theme: 'dark' }
                        }
                    }}
                />
              </div>
            ) : (
              <>
                {/* TAB 1: PLANS */}
                {activeTab === 'plans' && (
                  <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold mb-1">Meu Plano Atual</h3>
                        <div className="bg-[#1E1E1E] border border-green-500/30 p-4 rounded-2xl flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-lg text-green-400">{establishment?.subscription_plan}</h4>
                                <p className="text-sm text-gray-400">Expira em: {endDateFormatted}</p>
                            </div>
                            <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ativo
                            </span>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-4">Disponíveis para Troca</h3>
                    <div className="grid gap-4">
                        {plans.map(plan => {
                            const isCurrent = plan.name === establishment?.subscription_plan;
                            if (isCurrent) return null;

                            const isUpgrade = Number(plan.price) > Number(currentPlan?.price || 0);
                            
                            return (
                                <div key={plan.id} className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <div>
                                        <h4 className="font-bold">{plan.name}</h4>
                                        <p className="text-sm text-gray-400">R$ {plan.price}/{plan.interval_days === 30 ? 'mês' : 'ano'}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                                            isUpgrade 
                                                ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white' 
                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                    >
                                        {isUpgrade ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        {isUpgrade ? 'Upgrade' : 'Downgrade'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                )}

                {/* TAB 2: RENEW */}
                {activeTab === 'renew' && (
                   <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">Antecipar Renovação</h3>
                            <p className="text-gray-400">Garanta mais tempo de acesso e aproveite descontos exclusivos.</p>
                        </div>

                        <div className="grid gap-4">
                            <button 
                                onClick={() => handleRenewalOption(1, 0)}
                                className="group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all text-left flex items-center justify-between"
                            >
                                <div>
                                    <h4 className="font-bold text-lg group-hover:text-[#7C3AED] transition-colors">+1 Mês</h4>
                                    <p className="text-sm text-gray-400">Preço normal</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-white">R$ {Number(currentPlan?.price || 0).toFixed(2)}</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleRenewalOption(3, 5)}
                                className="group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all text-left flex items-center justify-between relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                                    5% OFF
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg group-hover:text-[#7C3AED] transition-colors">+3 Meses</h4>
                                    <p className="text-sm text-gray-400">Economize agora</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-white">R$ {(Number(currentPlan?.price || 0) * 3 * 0.95).toFixed(2)}</span>
                                    <p className="text-xs text-green-400">Economia de R$ {(Number(currentPlan?.price || 0) * 3 * 0.05).toFixed(2)}</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleRenewalOption(12, 10)}
                                className="group p-6 rounded-2xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 to-transparent hover:border-[#7C3AED] transition-all text-left flex items-center justify-between relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 bg-[#7C3AED] text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                                    10% OFF
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-[#7C3AED]">+1 Ano</h4>
                                    <p className="text-sm text-gray-400">Melhor custo-benefício</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-white">R$ {(Number(currentPlan?.price || 0) * 12 * 0.90).toFixed(2)}</span>
                                    <p className="text-xs text-[#7C3AED]">Economia de R$ {(Number(currentPlan?.price || 0) * 12 * 0.10).toFixed(2)}</p>
                                </div>
                            </button>
                        </div>
                   </div>
                )}

                {/* TAB 3: PAYMENT METHOD */}
                {activeTab === 'payment' && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <h3 className="text-2xl font-bold mb-4">Métodos de Pagamento</h3>
                        
                        <div className="p-6 rounded-2xl bg-[#1E1E1E] border border-white/10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-gray-300" />
                                </div>
                                <div>
                                    <h4 className="font-bold">Cartão de Crédito Principal</h4>
                                    <p className="text-sm text-gray-400">•••• •••• •••• 1234 (Mock)</p>
                                </div>
                            </div>
                            
                            <button className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-bold flex items-center justify-center gap-2">
                                Trocar Cartão Principal
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-6 rounded-2xl bg-[#1E1E1E] border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                    <img src="https://logopng.com.br/logos/pix-106.png" className="w-6 h-6 object-contain opacity-50" />
                                </div>
                                <div>
                                    <h4 className="font-bold">Priorizar Pix</h4>
                                    <p className="text-sm text-gray-400">Usar Pix como método padrão</p>
                                </div>
                            </div>
                            {/* Simple Toggle Switch Mock */}
                            <div className="w-12 h-6 rounded-full bg-white/10 relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500 transition-all"></div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 text-center mt-4">
                            <Shield className="w-3 h-3 inline mr-1" />
                            Seus dados são criptografados e processados pelo Mercado Pago.
                        </p>
                    </div>
                )}
              </>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
}
