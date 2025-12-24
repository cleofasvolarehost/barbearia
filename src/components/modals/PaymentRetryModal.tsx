import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Shield, CreditCard, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { MercadoPagoBrick } from '../payment/MercadoPagoBrick';
import { toast } from 'react-hot-toast';

interface PaymentRetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plans?: any[]; // Optional, might need to know the price
}

export function PaymentRetryModal({ isOpen, onClose, onSuccess, plans }: PaymentRetryModalProps) {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [loading, setLoading] = useState(false);

  // Determine amount to pay - for now mock or take from plan
  // If we had the invoice ID, we would fetch the amount.
  // Fallback: get price of current plan
  const currentPlan = plans?.find(p => p.name === establishment?.subscription_plan);
  const amountToPay = currentPlan ? Number(currentPlan.price) : 0;

  if (!isOpen) return null;

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
                plan_id: currentPlan?.id,
                issuer_id,
                payment_method_id,
                card_holder_name,
                identification,
                custom_amount: amountToPay,
                type: 'retry_payment',
                description: 'Pagamento Pendente - Regularização',
            })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Erro no pagamento');

        if (data.status === 'approved') {
            toast.success('Pagamento regularizado! Obrigado.');
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
        className="w-full max-w-lg bg-[#0A0A0A] border border-red-500/30 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
      >
         <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full z-10">
            <X className="w-5 h-5" />
          </button>

        <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Pagamento Pendente</h2>
                    <p className="text-sm text-red-400">Regularize para manter seu acesso.</p>
                </div>
            </div>

            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Identificamos uma falha no processamento da sua última fatura. 
                Atualize seu cartão abaixo para evitar o bloqueio dos serviços.
            </p>

            <div className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/10 mb-6 flex justify-between items-center">
                <span className="text-gray-300">Valor em aberto</span>
                <span className="text-xl font-bold text-white">R$ {amountToPay.toFixed(2)}</span>
            </div>

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
                        style: { theme: 'dark' },
                        hidePaymentButton: false
                    }
                }}
            />
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                Pagamento seguro via Mercado Pago
            </div>
        </div>
      </motion.div>
    </div>
  );
}
