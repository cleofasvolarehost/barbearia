import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Shield, ArrowRight, Star, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { MercadoPagoBrick } from '../payment/MercadoPagoBrick';
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
                custom_amount: amountToPay,
                type: 'new_subscription',
                description: paymentDescription,
            })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Erro no pagamento');

        if (data.status === 'approved') {
            toast.success('Assinatura ativada com sucesso!');
            await onSuccess();
            onClose();
        } else {
            toast.error('Pagamento não aprovado. Tente outro cartão.');
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
                             <MercadoPagoBrick 
                                amount={amountToPay}
                                email={user?.email || ''}
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
