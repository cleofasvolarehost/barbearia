import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Shield, ArrowRight, Star, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { createCardToken } from '../../lib/iugu';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
  onSuccess: () => void;
}

export function NewPurchaseModal({ isOpen, onClose, plans, onSuccess }: NewPurchaseModalProps) {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  
  const [step, setStep] = useState<'plans' | 'checkout'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Payment State
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState('');

  if (!isOpen) return null;

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setAmountToPay(Number(plan.price));
    setPaymentDescription(`Assinatura ${plan.name} (${plan.interval_days === 30 ? 'Mensal' : 'Anual'})`);
    setStep('checkout');
  };

  const [cardData, setCardData] = useState({ number: '', name: '', month: '', year: '', cvv: '' });
  const handleCardPay = async () => {
    if (amountToPay < 5) {
      toast.error('Valor mínimo para cartão é R$ 5,00');
      return;
    }
    setLoading(true);
    try {
        const fullName = cardData.name.trim();
        const [first_name, ...rest] = fullName.split(' ');
        const last_name = rest.join(' ') || first_name;
        const token = await createCardToken({ number: cardData.number.replace(/\s+/g, ''), verification_value: cardData.cvv, first_name, last_name, month: cardData.month, year: cardData.year });
        const { data: sessionData } = await supabase.auth.getSession();
        const bearer = sessionData.session?.access_token;
        const response = await apiFetch('/api/iugu/checkout/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
          body: JSON.stringify({ payment_token: token.id, amount_cents: Math.round(amountToPay * 100), email: user?.email || 'no-reply@example.com', items: [{ description: paymentDescription, quantity: 1, price_cents: Math.round(amountToPay * 100) }] })
        });
        if (!response.ok) throw new Error(await response.text());
        {
            toast.success('Assinatura ativada com sucesso!');
            await onSuccess();
            onClose();
        }

    } catch (error: any) {
        toast.error(`Erro: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[700px] shadow-2xl relative"
      >
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#7C3AED]/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {step === 'plans' ? (
                            <>
                                <Star className="w-6 h-6 text-[#7C3AED]" fill="currentColor" />
                                Escolha seu Plano
                            </>
                        ) : (
                            <>
                                <Shield className="w-6 h-6 text-green-500" />
                                Checkout Seguro
                            </>
                        )}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {step === 'plans' 
                            ? 'Desbloqueie todo o potencial da sua barbearia hoje.' 
                            : 'Complete seus dados para iniciar o acesso imediato.'}
                    </p>
                </div>
                
                {/* Steps Indicator */}
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full transition-colors ${step === 'plans' ? 'bg-[#7C3AED]' : 'bg-gray-700'}`} />
                    <div className="w-8 h-[1px] bg-gray-700" />
                    <div className={`w-3 h-3 rounded-full transition-colors ${step === 'checkout' ? 'bg-[#7C3AED]' : 'bg-gray-700'}`} />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {step === 'plans' ? (
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {plans.map((plan) => {
                            const isRecommended = plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('anual');
                            return (
                                <motion.div 
                                    key={plan.id}
                                    whileHover={{ y: -5 }}
                                    className={`relative p-6 rounded-3xl border flex flex-col ${
                                        isRecommended 
                                            ? 'bg-[#7C3AED]/5 border-[#7C3AED] shadow-[0_0_30px_-10px_rgba(124,58,237,0.3)]' 
                                            : 'bg-[#1E1E1E] border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {isRecommended && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#7C3AED] text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
                                            Recomendado
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold text-white">R$ {Number(plan.price).toFixed(0)}</span>
                                            <span className="text-gray-400">/{plan.interval_days === 30 ? 'mês' : 'ano'}</span>
                                        </div>
                                        {plan.description && <p className="text-sm text-gray-400 mt-2">{plan.description}</p>}
                                    </div>

                                    <ul className="space-y-3 mb-8 flex-1">
                                        {/* Mock Features based on plan - in real app should come from DB or config */}
                                        {['Agendamentos Ilimitados', 'Gestão Financeira', 'Lembretes WhatsApp'].map((feat, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isRecommended ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-white/10 text-gray-400'}`}>
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    <button 
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                            isRecommended 
                                                ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/25' 
                                                : 'bg-white text-black hover:bg-gray-200'
                                        }`}
                                    >
                                        Selecionar Plano <ArrowRight className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-right-8 duration-300">
                        {/* Summary Side */}
                        <div className="w-full md:w-1/3 space-y-6">
                            <button 
                                onClick={() => setStep('plans')}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                <ArrowRight className="w-4 h-4 rotate-180" /> Voltar para Planos
                            </button>

                            <div className="bg-[#1E1E1E] p-6 rounded-3xl border border-white/10">
                                <h3 className="text-lg font-bold text-white mb-4">Resumo</h3>
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                                    <span className="text-gray-400">{selectedPlan?.name}</span>
                                    <span className="font-bold">R$ {amountToPay.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xl font-bold text-[#10B981]">
                                    <span>Total</span>
                                    <span>R$ {amountToPay.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-[#7C3AED]/10 p-4 rounded-2xl border border-[#7C3AED]/20 flex items-start gap-3">
                                <Zap className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-[#7C3AED] text-sm">Ativação Imediata</h4>
                                    <p className="text-xs text-[#7C3AED]/80 mt-1">Seu acesso será liberado assim que o pagamento for confirmado.</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Side */}
                        <div className="flex-1">
                            <div className="space-y-3">
                              <input value={cardData.number} onChange={e=>setCardData({...cardData, number: e.target.value})} placeholder="Número do cartão" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
                              <input value={cardData.name} onChange={e=>setCardData({...cardData, name: e.target.value})} placeholder="Nome impresso" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
                              <div className="grid grid-cols-3 gap-2">
                                <input value={cardData.month} onChange={e=>setCardData({...cardData, month: e.target.value})} placeholder="MM" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
                                <input value={cardData.year} onChange={e=>setCardData({...cardData, year: e.target.value})} placeholder="AA" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
                                <input value={cardData.cvv} onChange={e=>setCardData({...cardData, cvv: e.target.value})} placeholder="CVV" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
                              </div>
                              <button onClick={handleCardPay} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white font-bold">{loading ? 'Processando...' : 'Pagar com Cartão'}</button>
                            </div>
                            
                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                                <Shield className="w-3 h-3" />
                                Pagamento processado de forma segura pelo Mercado Pago
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </div>
  );
}
