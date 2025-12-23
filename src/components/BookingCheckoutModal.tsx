import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Copy, Building2, Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { PaymentScreen, type PaymentMethod } from './PaymentScreen';

interface BookingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: any; // Appointment object (Optional now)
  onSuccess?: () => void;
  onConfirm?: (method: PaymentMethod) => void; // New prop for public booking
  establishment?: any;
}

export function BookingCheckoutModal({ isOpen, onClose, appointment, onSuccess, onConfirm, establishment }: BookingCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [view, setView] = useState<'selection' | 'payment'>('selection');

  // Fetch settings when modal opens
  useEffect(() => {
    if (isOpen) {
        if (establishment) {
             setSettings(establishment);
        } else if (appointment) {
             fetchSettings();
        }
      setView('selection');
      setSelectedMethod(null);
    }
  }, [isOpen, appointment, establishment]);

  const fetchSettings = async () => {
    try {
      let estId = appointment.establishment_id;
      
      if (!estId && appointment.barbeiro_id) {
          const { data: barber } = await supabase.from('barbeiros').select('establishment_id').eq('id', appointment.barbeiro_id).single();
          estId = barber?.establishment_id;
      }

      if (estId) {
          const { data } = await supabase.from('establishments').select('payment_mode, manual_pix_key, allow_pay_at_shop, mp_access_token').eq('id', estId).single();
          setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings', error);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedMethod) return;
    setLoading(true);

    // If we are in "Appointment Mode" (Admin/Dashboard)
    if (appointment) {
        try {
            // Update appointment status based on selection
            let newStatus = 'pendente'; // Default to pending payment
            
            if (selectedMethod === 'in-person') {
                newStatus = 'confirmado'; // Pay at shop = Confirmed immediately
            } else if (selectedMethod === 'pix-manual') {
                newStatus = 'pendente'; // Waiting for manual transfer
            } else if (selectedMethod === 'pix-auto') {
                // In a real app, we would create the MP preference/payment here
                newStatus = 'pendente'; 
            }

            const { error } = await supabase
                .from('agendamentos')
                .update({ status: newStatus })
                .eq('id', appointment.id);
            
            if (error) throw error;
            
            // Switch to payment screen
            setView('payment');

        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar agendamento');
        } finally {
            setLoading(false);
        }
    } else {
         // If we are in "Checkout Mode" (Public Booking Page)
         if (onConfirm && selectedMethod) {
             // Map internal payment method to the expected format of BookSlug
             // 'in-person' -> 'counter'
             // 'pix-auto' -> 'pix'
             // 'pix-manual' -> 'pix' (handled same way for now or different?)
             
             let methodForParent: any = 'counter';
             if (selectedMethod === 'pix-auto' || selectedMethod === 'pix-manual') {
                 methodForParent = 'pix';
             }
             
             onConfirm(methodForParent);
         }
         setLoading(false);
     }
  };

  const handleClose = () => {
      onClose();
      // If we finished the flow (view === 'payment'), we might want to trigger onSuccess from parent to refresh lists
      if (view === 'payment') {
          onSuccess();
      }
  };

  // Helper to get service name
  const getServiceName = () => {
      if (appointment?.servicos && appointment.servicos.length > 0) {
          return appointment.servicos[0]?.servico?.nome || 'Serviço';
      }
      return 'Serviço de Barbearia';
  };

  const getBarberName = () => {
      // Assuming appointment has expanded barber info or we just use default
      return appointment?.barbeiro?.nome || 'Barbeiro';
  };

  // Determine which options to show
  const showGateway = settings?.payment_mode === 'gateway_only' || settings?.payment_mode === 'hybrid';
  const showManual = settings?.payment_mode === 'manual_only' || settings?.payment_mode === 'hybrid';
  const showInPerson = settings?.allow_pay_at_shop;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-lg mx-auto bg-[#0a0a0a] rounded-t-3xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
              
              {view === 'selection' ? (
                <>
                    {/* Header */}
                    <div className="relative p-6 pb-4 bg-gradient-to-b from-[#7C3AED]/10 to-transparent border-b border-white/10">
                        <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                        <X className="w-4 h-4 text-gray-400" />
                        </button>

                        <h2 className="text-2xl font-black text-white mb-1">Como deseja pagar?</h2>
                        <p className="text-sm text-gray-400">Escolha a forma de pagamento</p>
                    </div>

                    {/* Payment Options */}
                    <div className="p-6 space-y-3">
                        {/* Option 1: Pix Automático */}
                        {showGateway && (
                            <motion.button
                            onClick={() => setSelectedMethod('pix-auto')}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden
                                ${
                                selectedMethod === 'pix-auto'
                                    ? 'border-[#7C3AED] bg-gradient-to-br from-[#7C3AED]/20 to-transparent shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                                    : 'border-white/10 bg-white/5 hover:bg-white/8'
                                }
                            `}
                            >
                            <div className="absolute top-3 right-3">
                                <div className="px-3 py-1 rounded-full bg-[#10B981] flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                <Zap className="w-3 h-3 text-white" />
                                <span className="text-xs font-bold text-white">Confirmação Imediata</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 pr-32">
                                <div
                                className={`
                                w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                                ${
                                    selectedMethod === 'pix-auto'
                                    ? 'bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] shadow-[0_0_20px_rgba(124,58,237,0.5)]'
                                    : 'bg-gradient-to-br from-[#32BCAD] to-[#2DD4BF]'
                                }
                                `}
                                >
                                <Smartphone className="w-8 h-8 text-white" />
                                </div>

                                <div className="flex-1">
                                <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                    Pix Automático
                                    {selectedMethod === 'pix-auto' && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center"
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                    )}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    QR Code gerado na hora. Liberação automática.
                                </p>
                                </div>
                            </div>
                            </motion.button>
                        )}

                        {/* Option 2: Pix Manual */}
                        {showManual && (
                            <motion.button
                            onClick={() => setSelectedMethod('pix-manual')}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                w-full p-4 rounded-2xl border-2 transition-all text-left
                                ${
                                selectedMethod === 'pix-manual'
                                    ? 'border-[#7C3AED] bg-gradient-to-br from-[#7C3AED]/20 to-transparent shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                                    : 'border-white/10 bg-white/5 hover:bg-white/8'
                                }
                            `}
                            >
                            <div className="flex items-start gap-4">
                                <div
                                className={`
                                w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                                ${
                                    selectedMethod === 'pix-manual'
                                    ? 'bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_20px_rgba(124,58,237,0.5)]'
                                    : 'bg-gradient-to-br from-purple-600 to-purple-700'
                                }
                                `}
                                >
                                <Copy className="w-6 h-6 text-white" />
                                </div>

                                <div className="flex-1">
                                <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                    Pix Manual (Chave do Barbeiro)
                                    {selectedMethod === 'pix-manual' && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center"
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                    )}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Copie a chave e envie o comprovante no WhatsApp
                                </p>
                                </div>
                            </div>
                            </motion.button>
                        )}

                        {/* Option 3: Pagar na Barbearia */}
                        {showInPerson && (
                            <motion.button
                            onClick={() => setSelectedMethod('in-person')}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                w-full p-4 rounded-2xl border-2 transition-all text-left
                                ${
                                selectedMethod === 'in-person'
                                    ? 'border-[#7C3AED] bg-gradient-to-br from-[#7C3AED]/20 to-transparent shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                                    : 'border-white/10 bg-white/5 hover:bg-white/8'
                                }
                            `}
                            >
                            <div className="flex items-start gap-4">
                                <div
                                className={`
                                w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                                ${
                                    selectedMethod === 'in-person'
                                    ? 'bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] shadow-[0_0_20px_rgba(124,58,237,0.5)]'
                                    : 'bg-gradient-to-br from-gray-700 to-gray-800'
                                }
                                `}
                                >
                                <Building2 className="w-6 h-6 text-white" />
                                </div>

                                <div className="flex-1">
                                <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                    Pagar na Barbearia
                                    {selectedMethod === 'in-person' && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center"
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                    )}
                                </h3>
                                <p className="text-sm text-gray-400">Dinheiro ou Cartão no local</p>
                                </div>
                            </div>
                            </motion.button>
                        )}
                    </div>

                    {/* Summary Section */}
                    <div className="px-6 pb-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Serviço</span>
                            <span className="text-sm text-white font-semibold">{getServiceName()}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="font-bold text-white">Total</span>
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">
                                R$ {Number(appointment?.preco_total || 0).toFixed(2)}
                            </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-6 pt-2">
                        <motion.button
                        onClick={handleConfirmSelection}
                        disabled={!selectedMethod || loading}
                        whileTap={selectedMethod && !loading ? { scale: 0.98 } : {}}
                        className={`
                            w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2
                            ${
                            selectedMethod && !loading
                                ? 'bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }
                        `}
                        >
                        {loading ? (
                            <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                            </>
                        ) : (
                            selectedMethod ? 'Finalizar Agendamento' : 'Selecione uma forma de pagamento'
                        )}
                        </motion.button>
                    </div>
                </>
              ) : (
                <PaymentScreen 
                    method={selectedMethod} 
                    onBack={() => setView('selection')}
                    amount={Number(appointment?.preco_total || 0)}
                    serviceName={getServiceName()}
                    pixKey={settings?.manual_pix_key}
                    barberName={getBarberName()}
                    onSuccess={handleClose}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
