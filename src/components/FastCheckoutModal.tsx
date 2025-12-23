import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Calendar, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

interface FastCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: GuestData) => void;
  loading?: boolean;
}

export interface GuestData {
  name: string;
  phone: string;
  birthDate?: string | null | undefined;
}

// Validation Schema
const schema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório'),
  phone: yup.string()
    .required('Telefone é obrigatório')
    .matches(/^\(\d{2}\) \d{5}-\d{4}$/, 'Formato inválido: (99) 99999-9999'),
  birthDate: yup.string().nullable().optional().test('is-valid-date', 'Data inválida ou futura', function(value) {
    if (!value) return true; // Allow empty
    
    // Check format DD/MM/YYYY
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
    
    const [day, month, year] = value.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Check if valid date
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return false;
    
    // Check if past date
    return date < new Date();
  })
});

// Infer the type from the schema to ensure compatibility
type GuestSchema = yup.InferType<typeof schema>;

export function FastCheckoutModal({ isOpen, onClose, onConfirm, loading }: FastCheckoutModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<GuestData>({
    resolver: yupResolver(schema) as any, // Cast to any to bypass strict type mismatch between optional fields
    defaultValues: {
      name: '',
      phone: '',
      birthDate: ''
    }
  });

  const onSubmit = (data: GuestData) => {
    onConfirm(data);
    reset();
  };

  // Mask helper
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 9)}-${value.slice(9)}`;
    }
    e.target.value = value;
    return e;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    if (value.length > 5) {
      value = `${value.slice(0, 5)}/${value.slice(5)}`;
    }
    e.target.value = value;
    return e;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-w-lg mx-auto"
          >
            <div className="bg-[#121212] rounded-t-[32px] border-t-2 border-x-2 border-[#7C3AED]/30 shadow-2xl">
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Finalização Rápida</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 max-h-[75vh] overflow-y-auto">
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-300">
                    Você está a um passo de confirmar seu agendamento! Preencha seus dados abaixo para continuar.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        {...register('name')}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
                        placeholder="Seu nome"
                      />
                    </div>
                    {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name.message}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">Celular (WhatsApp)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        {...register('phone')}
                        onChange={(e) => {
                            handlePhoneChange(e);
                            register('phone').onChange(e);
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
                        placeholder="(99) 99999-9999"
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
                  </div>

                  {/* Birth Date (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <label className="block text-sm font-medium text-gray-400">Data de Nascimento</label>
                      <span className="text-xs text-[#2DD4BF]">Opcional</span>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        {...register('birthDate')}
                        onChange={(e) => {
                            handleDateChange(e);
                            register('birthDate').onChange(e);
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                    {errors.birthDate && <p className="text-red-500 text-xs mt-1 ml-1">{errors.birthDate.message}</p>}
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white font-bold text-lg shadow-lg shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40 transition-shadow flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirmar Agendamento</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
