import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

interface PhoneCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (phone: string) => void;
  loading?: boolean;
}

interface PhoneFormData {
  phone: string;
}

const schema = yup.object().shape({
  phone: yup.string()
    .required('Telefone é obrigatório')
    .matches(/^\(\d{2}\) \d{5}-\d{4}$/, 'Formato inválido: (99) 99999-9999'),
});

export function PhoneCaptureModal({ isOpen, onClose, onConfirm, loading }: PhoneCaptureModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<PhoneFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data: PhoneFormData) => {
    onConfirm(data.phone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 9)}-${value.slice(9)}`;
    }
    setValue('phone', value);
    return e;
  };

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
                        onChange={handlePhoneChange}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all placeholder-gray-600"
                        placeholder="(99) 99999-9999"
                        autoFocus
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
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
