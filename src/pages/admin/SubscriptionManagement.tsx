import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { MercadoPagoBrick } from '../../components/payment/MercadoPagoBrick';
import { TrendingUp, Clock, CreditCard, Check, ArrowRight, Loader2 } from 'lucide-react';

export default function SubscriptionManagementPage() {
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  
  // Payment State
  const [paymentStep, setPaymentStep] = useState<'selection' | 'checkout'>('selection');
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentType, setPaymentType] = useState<'upgrade' | 'renewal' | 'new_subscription'>('renewal');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'renew' | 'payment'>('plans');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price');
        
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // VIEW 1: SALES SHOWCASE (No Active Subscription)
  // ------------------------------------------------------------------
  if (!loading && !establishmentLoading && (!establishment || establishment.subscription_status !== 'active')) {
      return (
        <div className="min-h-screen bg-[#121212] text-white p-6">
            <div className="max-w-7xl mx-auto mt-10">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Escolha seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">Plano Ideal</span>
                    </h1>
                    <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                        Você está a um passo de transformar sua barbearia. Escolha o plano que melhor se adapta ao seu momento.
                    </p>
                </div>

                {plans.length === 0 ? (
                    <div className="text-center py-20">
                        <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Carregando planos...</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan, index) => {
                            // Simple logic to highlight the middle plan or specific plan
                            const isHighlighted = index === 1 || plan.name.includes('Pro'); 
                            
                            return (
                                <div 
                                    key={plan.id} 
                                    className={`relative p-8 rounded-3xl border transition-all duration-300 ${
                                    isHighlighted
                                        ? 'bg-gradient-to-b from-[#7C3AED]/10 to-transparent border-[#7C3AED] shadow-2xl shadow-[#7C3AED]/20 scale-105 z-10'
                                        : 'bg-white/5 backdrop-blur border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {isHighlighted && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-sm font-bold text-white shadow-lg">
                                            Mais Popular
                                        </div>
                                    )}

                                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                    <p className="text-gray-400 mb-6 min-h-[48px]">
                                        {plan.description || 'A solução completa para sua gestão.'}
                                    </p>

                                    <div className="mb-8">
                                        <div className="flex items-end gap-1">
                                            <span className="text-5xl font-bold text-white">R$ {Number(plan.price).toFixed(0)}</span>
                                            <span className="text-gray-400 mb-1">/{plan.interval_days === 30 ? 'mês' : 'ano'}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => navigate(`/checkout/start?plan=${plan.id}`)}
                                        className={`w-full py-4 rounded-full font-bold text-lg mb-8 transition-all ${
                                            isHighlighted
                                            ? 'bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white hover:shadow-lg hover:shadow-[#7C3AED]/50 hover:scale-[1.02]'
                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                        }`}
                                    >
                                        Assinar Agora
                                    </button>

                                    <ul className="space-y-4">
                                        {(plan.features || [
                                            'Agendamento Ilimitado',
                                            'Gestão Financeira',
                                            'Suporte Prioritário'
                                        ]).map((feature: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className={`mt-1 p-1 rounded-full ${isHighlighted ? 'bg-[#10B981]/20' : 'bg-white/10'}`}>
                                                    <Check className={`w-3 h-3 ${isHighlighted ? 'text-[#10B981]' : 'text-gray-400'}`} />
                                                </div>
                                                <span className="text-gray-300 text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      );
  }

  // ------------------------------------------------------------------
  // VIEW 2: MANAGEMENT DASHBOARD (Active Subscription)
  // ------------------------------------------------------------------

  const currentPlan = plans.find(p => p.name === establishment?.subscription_plan);
  const currentPrice = currentPlan ? Number(currentPlan.price) : 0;

  const endDate = establishment?.subscription_end_date ? new Date(establishment.subscription_end_date) : null;
  const endDateFormatted = endDate ? endDate.toLocaleDateString() : '-';
  const now = new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
  const status = establishment?.subscription_status || 'none';

  const handleCancelSubscription = async () => {
    if (!establishment?.id) return;
    const ok = window.confirm('Tem certeza que deseja cancelar a assinatura?');
    if (!ok) return;
    setCanceling(true);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel', establishment_id: establishment.id },
      });
      if (error) throw error;
      toast.success('Assinatura cancelada com sucesso');
      window.location.reload();
    } catch (err: any) {
      toast.error(`Erro ao cancelar: ${err.message || 'tente novamente'}`);
    } finally {
      setCanceling(false);
    }
  };

  const handleSelectPlan = (plan: any) => {
    const planPrice = Number(plan.price);
    
    // Allow selection if no current plan OR upgrade
    if (currentPrice === 0 || planPrice > currentPrice) {
        const diff = currentPrice === 0 ? planPrice : (planPrice - currentPrice);
        
        setAmountToPay(diff > 0 ? diff : planPrice);
        setPaymentDescription(currentPrice === 0 ? `Assinatura ${plan.name}` : `Upgrade para ${plan.name}`);
        setPaymentType(currentPrice === 0 ? 'new_subscription' : 'upgrade');
        setSelectedPlan(plan);
        setPaymentStep('checkout');
    } else if (planPrice < currentPrice) {
        toast('Para downgrade, entre em contato com o suporte.', { icon: 'ℹ️' });
    }
  };

  const handleRenewalOption = (months: number, discountPercent: number) => {
    if (!currentPlan) return;
    const basePrice = Number(currentPlan.price);
    const total = basePrice * months;
    const discounted = total * (1 - discountPercent / 100);
    
    setAmountToPay(discounted);
    setPaymentDescription(`Renovação Antecipada (+${months} meses)`);
    setPaymentType('renewal');
    setSelectedPlan(currentPlan);
    setPaymentStep('checkout');
  };

  const handleBrickSuccess = async (token: string | undefined, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => {
    setLoading(true);
    try {
        const { error } = await supabase.functions.invoke('create-subscription', {
            body: {
                token,
                payer_email: user?.email,
                establishment_id: establishment?.id,
                plan_id: selectedPlan?.id,
                issuer_id,
                payment_method_id,
                card_holder_name,
                identification,
                custom_amount: amountToPay,
                type: paymentType,
                description: paymentDescription,
                days_to_add: paymentType === 'renewal' ? 
                    (paymentDescription.includes('+1 Mês') ? 30 : 
                     paymentDescription.includes('+3 Meses') ? 90 : 
                     paymentDescription.includes('+1 Ano') ? 365 : 30) : undefined
            }
        });

        if (error) throw error;
        toast.success('Pagamento realizado com sucesso!');
        window.location.reload(); // Refresh state
    } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Gerenciar Assinatura</h1>
        {/* Resumo da Assinatura */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-sm text-gray-400">Plano</p>
            <p className="text-xl font-bold">{establishment?.subscription_plan || '-'}</p>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-sm text-gray-400">Vencimento</p>
            <p className="text-xl font-bold">{endDateFormatted}</p>
            {typeof daysLeft === 'number' && (
              <p className="text-xs text-gray-400 mt-1">Faltam {daysLeft} dias</p>
            )}
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                status === 'active' ? 'bg-green-500/20 text-green-400' :
                status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                status === 'cancelled' ? 'bg-gray-500/20 text-gray-300' : 'bg-white/10 text-gray-300'
              }`}>{status === 'active' ? 'Ativo' : status === 'suspended' ? 'Suspenso' : status === 'cancelled' ? 'Cancelado' : 'Sem assinatura'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setActiveTab('renew'); setPaymentStep('selection'); }} className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white font-bold hover:bg-[#6D28D9]">Renovar</button>
              <button onClick={() => { setActiveTab('plans'); setPaymentStep('selection'); }} className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20">Trocar Plano</button>
              {status === 'active' && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className={`px-4 py-2 rounded-lg font-bold ${canceling ? 'bg-red-500/10 text-red-300 cursor-not-allowed' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                >
                  {canceling ? 'Cancelando...' : 'Cancelar'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-2">
            <button 
              onClick={() => { setActiveTab('plans'); setPaymentStep('selection'); }}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'plans' ? 'bg-[#7C3AED] text-white' : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#2A2A2A]'}`}
            >
              <TrendingUp className="w-5 h-5" /> Planos
            </button>
            <button 
              onClick={() => { setActiveTab('renew'); setPaymentStep('selection'); }}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'renew' ? 'bg-[#7C3AED] text-white' : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#2A2A2A]'}`}
            >
              <Clock className="w-5 h-5" /> Renovação
            </button>
            <button 
              onClick={() => { setActiveTab('payment'); setPaymentStep('selection'); }}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'payment' ? 'bg-[#7C3AED] text-white' : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#2A2A2A]'}`}
            >
              <CreditCard className="w-5 h-5" /> Pagamento
            </button>
          </div>

          {/* Content */}
          <div className="md:col-span-3 bg-[#1E1E1E] rounded-3xl p-8 border border-white/5">
            {paymentStep === 'checkout' ? (
                <div className="max-w-md mx-auto">
                    <button onClick={() => setPaymentStep('selection')} className="mb-6 text-gray-400 hover:text-white flex items-center gap-2">
                        <ArrowRight className="rotate-180 w-4 h-4" /> Voltar
                    </button>
                    <h2 className="text-2xl font-bold mb-2">Confirmar Pagamento</h2>
                    <p className="text-gray-400 mb-6">{paymentDescription}</p>
                    <div className="text-3xl font-bold text-[#10B981] mb-8">R$ {amountToPay.toFixed(2)}</div>
                    
                    {user?.email && (
                        <MercadoPagoBrick 
                            amount={amountToPay}
                            email={user.email}
                            onSuccess={handleBrickSuccess}
                            onError={() => toast.error('Erro no pagamento')}
                            customization={{ visual: { style: { theme: 'default' } } }}
                        />
                    )}
                </div>
            ) : (
                <>
                    {activeTab === 'plans' && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold mb-4">Planos Disponíveis</h2>
                            {plans.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-gray-400">Nenhum plano disponível no momento.</p>
                                </div>
                            ) : (
                                plans.map(plan => {
                                    const isCurrent = plan.name === establishment?.subscription_plan;
                                    return (
                                        <div key={plan.id} className={`p-6 rounded-2xl border ${isCurrent ? 'border-[#10B981] bg-[#10B981]/10' : 'border-white/10 bg-white/5'} flex justify-between items-center`}>
                                            <div>
                                                <h3 className="font-bold text-lg">{plan.name}</h3>
                                                <p className="text-gray-400">R$ {plan.price}/{plan.interval_days === 30 ? 'mês' : 'ano'}</p>
                                            </div>
                                            {isCurrent ? (
                                                <span className="text-[#10B981] font-bold flex items-center gap-2"><Check className="w-4 h-4" /> Atual</span>
                                            ) : (
                                                <button onClick={() => handleSelectPlan(plan)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold">
                                                    Selecionar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'renew' && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold mb-4">Antecipar Renovação</h2>
                            <div className="grid gap-4">
                                <button onClick={() => handleRenewalOption(1, 0)} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#7C3AED] text-left">
                                    <h3 className="font-bold text-lg">+1 Mês</h3>
                                    <p className="text-gray-400">R$ {currentPrice.toFixed(2)}</p>
                                </button>
                                <button onClick={() => handleRenewalOption(3, 5)} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#7C3AED] text-left relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-[#10B981] text-black text-xs font-bold px-2 py-1">5% OFF</div>
                                    <h3 className="font-bold text-lg">+3 Meses</h3>
                                    <p className="text-gray-400">R$ {(currentPrice * 3 * 0.95).toFixed(2)}</p>
                                </button>
                                <button onClick={() => handleRenewalOption(12, 10)} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#7C3AED] text-left relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-[#7C3AED] text-white text-xs font-bold px-2 py-1">10% OFF</div>
                                    <h3 className="font-bold text-lg">+1 Ano</h3>
                                    <p className="text-gray-400">R$ {(currentPrice * 12 * 0.90).toFixed(2)}</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="text-center py-10">
                            <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-gray-400">Em breve</h2>
                            <p className="text-gray-500">Gerenciamento de cartões salvos.</p>
                        </div>
                    )}
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
