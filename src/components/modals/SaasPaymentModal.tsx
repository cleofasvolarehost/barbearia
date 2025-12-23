import { useEffect, useState } from 'react';
import { MercadoPagoBrick } from '../payment/MercadoPagoBrick';
import { ArrowRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useEstablishment } from '../../contexts/EstablishmentContext';

interface SaasPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSuccess: () => void;
}

export function SaasPaymentModal({ isOpen, onClose, plan, onSuccess }: SaasPaymentModalProps) {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !plan) return null;

  const handleBrickSuccess = async (token: string | undefined, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => {
    setLoading(true);
    try {
        if (!establishment || !user?.email) return;

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
                establishment_id: establishment.id,
                plan_id: plan.id,
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
        onSuccess();
        onClose();

    } catch (error: any) {
        console.error('Subscription error:', error);
        toast.error(`Erro: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleBrickError = (error: any) => {
      console.error('Brick Error:', error);
      const msg = typeof error === 'string' ? error : 'Erro no processamento. Tente novamente.';
      toast.error(msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="max-w-md w-full relative">
            <button 
                onClick={onClose}
                className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Finalizar Assinatura</h2>
                    <p className="text-gray-400">
                        Plano <span className="text-[#7C3AED] font-bold">{plan.name}</span> - R$ {plan.price}
                    </p>
                </div>

                <MercadoPagoBrick 
                    amount={plan.price || 0}
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
