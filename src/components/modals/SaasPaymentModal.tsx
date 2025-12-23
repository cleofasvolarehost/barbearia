import { useEffect, useState } from 'react';
import { MercadoPagoBrick } from '../payment/MercadoPagoBrick';
import { ArrowRight, X, Copy, Check, Loader2 } from 'lucide-react';
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
  const [pixData, setPixData] = useState<{ qr_code: string, qr_code_base64: string, ticket_url?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
        setPixData(null);
        setLoading(false);
    }
  }, [isOpen]);

  // STRICT VALIDATION: Ensure plan and price exist
  if (!isOpen) return null;

  const isValidPlan = plan && plan.id && Number(plan.price) > 0;
  
  if (!isValidPlan) {
      if (isOpen) {
          console.warn("SaasPaymentModal: Invalid Plan Data", plan);
      }
      return null; 
  }

  const handleCopyPix = () => {
      if (!pixData?.qr_code) return;
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
  };

  const handleBrickSuccess = async (token: string | undefined, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => {
    setLoading(true);
    try {
        if (!establishment || !user?.email) return;

        console.log('Creating subscription with plan_id=', plan.id, 'price=', plan.price);
        console.log('Method:', payment_method_id);

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
        console.log('Function Response:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao processar assinatura');
        }

        // Handle PIX Response
        if (data.qr_code && data.qr_code_base64) {
            setPixData({
                qr_code: data.qr_code,
                qr_code_base64: data.qr_code_base64
            });
            toast.success('PIX gerado com sucesso!');
            return; // Stay in modal to show QR
        }

        // Handle Card/Approved Response
        if (data.status === 'approved') {
            toast.success(`Assinatura iniciada com sucesso!`);
            onSuccess();
            onClose();
        } else if (payment_method_id === 'pix' && data.status === 'pending') {
             // PIX Pending but no QR Code?
             console.warn('PIX Pending but missing QR Code data', data);
             toast.error('Erro ao gerar QR Code. Verifique o console ou tente novamente.');
             // Do NOT close modal, let user try again or see error
        } else {
             // Pending (Card review) or other status
             toast('Pagamento em processamento.', { icon: '⏳' });
             onSuccess(); 
             onClose();
        }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="max-w-md w-full relative my-8">
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all z-50"
                aria-label="Fechar"
            >
                <X className="w-8 h-8" />
            </button>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl relative flex flex-col max-h-[85vh] w-full">
                
                {/* Back / Change Plan Button (Only if not in PIX mode) */}
                {!pixData && (
                    <div className="absolute -top-12 left-0 z-50">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-all backdrop-blur-md border border-white/10 group shadow-lg"
                        >
                            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                            Trocar Plano
                        </button>
                    </div>
                )}

                {/* Header Section - Fixed */}
                <div className="p-6 md:p-8 pb-0 text-center shrink-0">
                    <h2 className="text-2xl font-bold mb-2 text-white">
                        {pixData ? 'Pagamento via PIX' : 'Finalizar Assinatura'}
                    </h2>
                    <p className="text-gray-400">
                        Plano <span className="text-[#7C3AED] font-bold">{plan.name}</span> - R$ {plan.price}
                    </p>
                </div>

                {/* Scrollable Content Section */}
                <div className="p-6 md:p-8 pt-6 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin" />
                            <p className="text-gray-400 animate-pulse">Processando pagamento...</p>
                        </div>
                    ) : pixData ? (
                        // PIX View
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-xl shadow-lg shadow-[#7C3AED]/20">
                                    <img 
                                        src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                                        alt="QR Code Pix" 
                                        className="w-48 h-48 object-contain"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-center text-gray-400">
                                    Escaneie o QR Code ou copie o código abaixo:
                                </p>
                                <div className="relative group">
                                    <textarea
                                        readOnly
                                        value={pixData.qr_code}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pr-12 text-xs text-gray-400 font-mono resize-none focus:border-[#7C3AED] outline-none h-24 transition-colors"
                                    />
                                    <button
                                        onClick={handleCopyPix}
                                        className="absolute top-2 right-2 p-2 bg-[#7C3AED]/10 hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white rounded-lg transition-all"
                                        title="Copiar código"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {pixData.ticket_url && (
                                <a 
                                    href={pixData.ticket_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block w-full text-center py-3 rounded-xl border border-[#7C3AED] text-[#7C3AED] font-bold hover:bg-[#7C3AED] hover:text-white transition-all"
                                >
                                    Abrir no Mercado Pago ↗
                                </a>
                            )}

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                                <p className="text-yellow-400 text-sm font-bold flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Aguardando pagamento...
                                </p>
                                <p className="text-xs text-yellow-200/60 mt-1">
                                    A confirmação será automática em alguns instantes.
                                </p>
                            </div>
                            
                            <button
                                onClick={onClose}
                                className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                Fechar e Aguardar
                            </button>
                        </div>
                    ) : (
                        // Brick View
                        <>
                            <MercadoPagoBrick 
                                amount={Number(plan.price)} 
                                email={user?.email || ''}
                                onSuccess={handleBrickSuccess}
                                onError={handleBrickError}
                            />
                            <p className="text-xs text-center text-gray-500 mt-6 pb-2">
                                Ambiente Seguro Mercado Pago. Seus dados são criptografados.
                            </p>
                        </>
                    )}
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.5); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(124, 58, 237, 0.7); }
            `}</style>
        </div>
    </div>
  );
}
