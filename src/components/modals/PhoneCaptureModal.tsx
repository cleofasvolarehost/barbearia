import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface PhoneCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (phone: string) => void;
  loading?: boolean;
}

// 1. maskPhone: Formats value to (DD) 99999-9999
const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// 2. isValidBrazilWhatsApp: Validates strictly 11 digits and 3rd digit '9'
const isValidBrazilWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, '');
  // Must be 11 digits
  if (digits.length !== 11) return false;
  // 3rd digit (index 2) must be 9
  if (digits[2] !== '9') return false;
  return true;
};

export function PhoneCaptureModal({ isOpen, onClose, onConfirm, loading }: PhoneCaptureModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isValid }
  } = useForm<{ phone: string }>({
    mode: 'onChange'
  });

  const phoneValue = watch('phone');

  // Real-time Validation and Masking
  useEffect(() => {
    if (!phoneValue) return;

    // Apply Mask
    const masked = maskPhone(phoneValue);
    if (masked !== phoneValue) {
      setValue('phone', masked);
    }

    // Validate Logic
    if (isValidBrazilWhatsApp(phoneValue)) {
      clearErrors('phone');
    } else {
      // Only show error if user has typed enough to potentialy be valid or finished typing
      const digits = phoneValue.replace(/\D/g, '');
      if (digits.length === 11 && digits[2] !== '9') {
          setError('phone', { type: 'custom', message: 'Celular deve começar com 9 (ex: 38 9xxxx-xxxx).' });
      } else if (digits.length > 0 && digits.length < 11) {
         // Optional: Don't show "incomplete" error aggressively while typing, 
         // but since we want to disable button, we can just rely on isValid state for button
         // and show specific error only on blur or submit. 
         // For now, let's keep it clean: error if invalid format
         setError('phone', { type: 'custom', message: 'Número incompleto. Digite DDD + 9 dígitos.' });
      }
    }
  }, [phoneValue, setValue, setError, clearErrors]);

  const onSubmit = (data: { phone: string }) => {
    if (isValidBrazilWhatsApp(data.phone)) {
      // Normalize to E.164 (55 + digits)
      const digits = data.phone.replace(/\D/g, '');
      const e164 = `55${digits}`;
      onConfirm(e164);
    }
  };

  const isFormValid = isValidBrazilWhatsApp(phoneValue || '');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#121212] rounded-3xl border border-[#7C3AED]/30 shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Quase lá!</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Precisamos do seu WhatsApp</h3>
                    <p className="text-gray-400 text-sm">
                        Para confirmar o agendamento e enviar notificações, precisamos de um número válido.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">Celular (WhatsApp)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        {...register('phone')}
                        type="tel"
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all placeholder-gray-600"
                        placeholder="(38) 99999-9999"
                        autoFocus
                        maxLength={15} // (11) 91234-5678 is 15 chars
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
                    {!errors.phone && isFormValid && <p className="text-green-500 text-xs mt-1 ml-1">Número válido!</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white font-bold text-lg shadow-lg shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Salvar e Agendar</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
