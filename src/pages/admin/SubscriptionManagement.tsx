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
  
  // Redirect if no active subscription (User should go to Landing Page to pick a plan)
   useEffect(() => {
     if (!establishmentLoading && (!establishment || establishment.subscription_status !== 'active')) {
          // Redirect to Landing Page (#pricing) so they can pick a plan and go to Fast Checkout
          // Using window.location.href to ensure anchor scrolling works reliably
          window.location.href = '/#pricing'; 
      }
   }, [establishment, establishmentLoading, navigate]);
  const [activeTab, setActiveTab] = useState<'plans' | 'renew' | 'payment'>('plans');
  
  // Payment State
  const [paymentStep, setPaymentStep] = useState<'selection' | 'checkout'>('selection');
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentType, setPaymentType] = useState<'upgrade' | 'renewal' | 'new_subscription'>('renewal');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        // .eq('active', true) // Column might not exist yet
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

  const currentPlan = plans.find(p => p.name === establishment?.subscription_plan);
  const currentPrice = currentPlan ? Number(currentPlan.price) : 0;

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
