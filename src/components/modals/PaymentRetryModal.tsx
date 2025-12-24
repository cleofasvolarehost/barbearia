import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Shield, CreditCard, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { createCardToken } from '../../lib/iugu';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
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
          body: JSON.stringify({ payment_token: token.id, amount_cents: Math.round(amountToPay * 100), email: user?.email || 'no-reply@example.com', items: [{ description: 'Pagamento Pendente - Regularização', quantity: 1, price_cents: Math.round(amountToPay * 100) }] })
        });
        if (!response.ok) throw new Error(await response.text());
        {
            toast.success('Pagamento regularizado! Obrigado.');
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

            <div className="space-y-3">
              <input value={cardData.number} onChange={e=>setCardData({...cardData, number: e.target.value})} placeholder="Número do cartão" className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-white/10 text-white" />
              <input value={cardData.name} onChange={e=>setCardData({...cardData, name: e.target.value})} placeholder="Nome impresso" className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-white/10 text-white" />
              <div className="grid grid-cols-3 gap-2">
                <input value={cardData.month} onChange={e=>setCardData({...cardData, month: e.target.value})} placeholder="MM" className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-white/10 text-white" />
                <input value={cardData.year} onChange={e=>setCardData({...cardData, year: e.target.value})} placeholder="AA" className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-white/10 text-white" />
                <input value={cardData.cvv} onChange={e=>setCardData({...cardData, cvv: e.target.value})} placeholder="CVV" className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-white/10 text-white" />
              </div>
              <button onClick={handleCardPay} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white font-bold">{loading ? 'Processando...' : 'Pagar com Cartão'}</button>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                Pagamento seguro via Mercado Pago
            </div>
        </div>
      </motion.div>
    </div>
  );
}
