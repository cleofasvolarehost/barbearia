import { useEffect, useState } from 'react';
import { MercadoPagoBrick } from '../payment/MercadoPagoBrick';
import { X, Copy, Check, Loader2, CreditCard, Barcode, Crown, ShieldCheck, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { motion, AnimatePresence } from 'motion/react';

interface SaasPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSuccess: () => void;
}

interface PixData {
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
}

type PaymentMethod = 'credit' | 'pix' | 'boleto' | null;

export function SaasPaymentModal({ isOpen, onClose, plan, onSuccess }: SaasPaymentModalProps) {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Custom UI State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
        setPixData(null);
        setLoading(false);
        setSelectedMethod('pix');
        setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValidPlan = plan && plan.id && Number(plan.price) > 0;
  
  if (!isValidPlan) {
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

        const qrCode = data.qr_code || data.point_of_interaction?.transaction_data?.qr_code;
        const qrCodeBase64 = data.qr_code_base64 || data.point_of_interaction?.transaction_data?.qr_code_base64;
        const ticketUrl = data.ticket_url || data.point_of_interaction?.transaction_data?.ticket_url;
        const status = data.status;

        if (qrCode && qrCodeBase64) {
            setPixData({
                qr_code: qrCode,
                qr_code_base64: qrCodeBase64,
                ticket_url: ticketUrl
            });
            toast.success('PIX gerado com sucesso!');
            return;
        }

        if (status === 'approved') {
            setShowSuccess(true);
            toast.success(`Assinatura iniciada com sucesso!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 3000);
        } else if (payment_method_id === 'pix' && status === 'pending') {
             console.warn('PIX Pending but missing QR Code data', data);
             toast.error('Erro ao gerar QR Code. Verifique o console ou tente novamente.');
        } else {
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

  const paymentMethodsList = [
    {
      id: 'pix' as PaymentMethod,
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 512 512" fill="currentColor">
          <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 353.7 407.2 339.5 421.4C325.3 435.6 301.8 435.6 287.6 421.4L210.6 344.4C205.2 339 205.2 329.7 210.6 324.3L242.4 292.5ZM262.5 219.5C257.1 224.9 247.8 224.9 242.4 219.5L165.4 142.5C151.2 128.3 151.2 104.8 165.4 90.6C179.6 76.4 203.1 76.4 217.3 90.6L294.3 167.6C299.7 173 299.7 182.3 294.3 187.7L262.5 219.5ZM384 262.5C378.6 257.1 378.6 247.8 384 242.4L461 165.4C475.2 151.2 498.7 151.2 512.9 165.4C527.1 179.6 527.1 203.1 512.9 217.3L435.9 294.3C430.5 299.7 421.2 299.7 415.8 294.3L384 262.5zM90.6 294.3C76.4 280.1 76.4 256.6 90.6 242.4L167.6 165.4C173 160 182.3 160 187.7 165.4L219.5 197.2C224.9 202.6 224.9 211.9 219.5 217.3L142.5 294.3C128.3 308.5 104.8 308.5 90.6 294.3z" />
        </svg>
      ),
      title: 'Pix',
      subtitle: 'Pagamento instantâneo',
      badge: 'Mais Rápido',
      color: 'from-[#10B981] to-[#14B8A6]',
    },
    {
      id: 'credit' as PaymentMethod,
      icon: <CreditCard className="w-7 h-7" />,
      title: 'Cartão de Crédito',
      subtitle: 'Aprovação imediata',
      badge: 'Recomendado',
      color: 'from-[#7C3AED] to-[#A855F7]',
    },
    {
      id: 'boleto' as PaymentMethod,
      icon: <Barcode className="w-7 h-7" />,
      title: 'Boleto Bancário',
      subtitle: 'Confirmação em até 2 dias úteis',
      badge: null,
      color: 'from-gray-600 to-gray-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl p-4 overflow-y-auto">
        <div className="w-full max-w-md relative my-8">
            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.22),_transparent_55%)] blur-2xl" />
            <div className="bg-[#0B0B0F] border border-white/10 rounded-[32px] shadow-[0_0_60px_rgba(124,58,237,0.22)] relative flex flex-col w-full overflow-hidden min-h-[620px]">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_50%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_45%)]" />
                
                {/* Header */}
                <div className="px-6 pt-7 pb-5 relative z-10">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {selectedMethod && !pixData && (
                         <button
                            onClick={() => setSelectedMethod(null)}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </button>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <p className="text-xs uppercase tracking-[0.3em] text-[#10B981] font-semibold mb-2">
                            Assinatura Premium
                        </p>
                        <h1 className="text-3xl font-black mb-1 text-white">{pixData ? 'Pagamento via Pix' : 'Finalizar Assinatura'}</h1>
                        <p className="text-sm text-gray-400">Conclua o pagamento para liberar todos os recursos.</p>
                    </motion.div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 relative z-10">
                    
                    {/* Plan Summary Card */}
                    {!pixData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mx-6 mb-6"
                    >
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-white/10 via-white/[0.04] to-white/[0.02] border border-white/20 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#10B981] flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                                    <Crown className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-lg text-white mb-1">{plan.name}</h3>
                                    <p className="text-sm text-gray-400">Cobrado mensalmente</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#10B981]">
                                        R$ {Number(plan.price).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500">/mês</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    )}

                    {/* PIX QR CODE VIEW */}
                    {pixData ? (
                        <div className="mx-6 space-y-6 animate-in fade-in zoom-in duration-300">
                             <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-2xl shadow-lg shadow-[#7C3AED]/20">
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
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-xs text-gray-300 font-mono resize-none focus:border-[#7C3AED] outline-none h-24 transition-colors"
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
                             <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
                                <p className="text-yellow-400 text-sm font-bold flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Aguardando pagamento...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Security Fortress */}
                            {!selectedMethod && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mx-6 mb-8"
                            >
                                <div className="relative p-6 rounded-3xl backdrop-blur-xl overflow-hidden border border-[#10B981]/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/10 via-[#14B8A6]/5 to-transparent" />
                                    <motion.div
                                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.02, 1] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="absolute inset-0 bg-gradient-to-br from-[#10B981]/20 to-transparent rounded-3xl"
                                    />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                                                <ShieldCheck className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-black text-lg text-white">Pagamento 100% Seguro</h3>
                                                <p className="text-xs text-[#10B981] font-semibold">via Mercado Pago</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <Lock className="w-4 h-4 text-[#10B981]" />
                                                <span>Criptografia de nível bancário</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                            )}

                            {/* Payment Method Selection */}
                            <div className="px-6 flex-1">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">
                                    Escolha a forma de pagamento
                                </h3>
                                <div className="space-y-3">
                                    {paymentMethodsList.map((method, index) => (
                                        <motion.button
                                            key={method.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                            onClick={() => setSelectedMethod(method.id)}
                                            className={`
                                                w-full min-h-[80px] p-5 rounded-2xl transition-all relative overflow-hidden group
                                                ${selectedMethod === method.id 
                                                    ? 'border-2 border-[#10B981] bg-white/10 shadow-[0_18px_30px_rgba(16,185,129,0.15)]' 
                                                    : 'border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${method.color}`} />
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                                                    ${selectedMethod === method.id 
                                                        ? 'bg-[#10B981] text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                                                        : 'bg-white/10 text-gray-200 group-hover:text-white'
                                                    }
                                                `}>
                                                    {method.icon}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-white">{method.title}</h4>
                                                        {method.badge && (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                                                                {method.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-300">{method.subtitle}</p>
                                                </div>
                                                {selectedMethod === method.id && (
                                                    <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            {/* Render Brick based on selection */}
                            <div className="px-6 pb-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {selectedMethod && (
                                <MercadoPagoBrick 
                                    key={selectedMethod} // FORCE RE-RENDER on method change to auto-select single option
                                    amount={Number(plan.price)} 
                                    email={user?.email || ''}
                                    onSuccess={handleBrickSuccess}
                                    onError={handleBrickError}
                                    customization={{
                                        paymentMethods: {
                                            creditCard: selectedMethod === 'credit' ? 'all' : [],
                                            debitCard: selectedMethod === 'credit' ? 'all' : [],
                                            ticket: selectedMethod === 'boleto' ? 'all' : [],
                                            bankTransfer: selectedMethod === 'pix' ? ['pix'] : [],
                                            maxInstallments: 1
                                        },
                                        visual: {
                                            style: {
                                                theme: 'dark',
                                                customVariables: {
                                                    formPadding: '0px',
                                                    baseColor: '#10B981'
                                                }
                                            },
                                            hidePaymentButton: false 
                                        }
                                    }}
                                />
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Note */}
                <div className="p-4 border-t border-white/10 bg-[#0A0A0A] text-center">
                     <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                        Ambiente Seguro Mercado Pago. Seus dados são criptografados.
                    </p>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.5); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(124, 58, 237, 0.7); }
            `}</style>
        </div>

        {/* Success Overlay */}
        <AnimatePresence>
            {showSuccess && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center rounded-3xl"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="text-center px-6"
                    >
                        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.8)]">
                            <CheckCircle2 className="w-16 h-16 text-white" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-3">Pagamento Aprovado!</h2>
                        <p className="text-lg text-gray-400">Sua assinatura está ativa</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}
