import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface Branding {
    primaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
    shopName?: string;
}

interface SuccessStepProps {
  dateStr: string;
  timeStr: string;
  barberName: string;
  serviceName: string;
  onRestart: () => void;
  branding?: Branding;
}

export function SuccessStep({ dateStr, timeStr, barberName, serviceName, onRestart, branding }: SuccessStepProps) {
  const primaryColor = branding?.primaryColor || '#7C3AED';

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="fixed inset-0">
        <motion.div
          animate={{
            background: [
              `radial-gradient(circle at 20% 50%, #10B981 0%, transparent 50%)`,
              `radial-gradient(circle at 80% 50%, ${primaryColor} 0%, transparent 50%)`,
              `radial-gradient(circle at 50% 80%, #10B981 0%, transparent 50%)`,
              `radial-gradient(circle at 20% 50%, #10B981 0%, transparent 50%)`,
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full opacity-20"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, delay: 0.2 }}
            className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.8)]"
          >
            <CheckCircle2 className="w-16 h-16 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#14B8A6]"
          >
            AGENDADO!
          </motion.h1>

          {/* Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-8 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20 mb-8"
          >
            <div className="space-y-4 text-left">
              <div className="pb-4 border-b border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Data e Hora</p>
                <p className="text-2xl font-black text-white">
                  {dateStr} às {timeStr}
                </p>
              </div>

              <div className="pb-4 border-b border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Barbeiro</p>
                <p className="text-xl font-bold text-white">{barberName}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Serviço</p>
                <p className="text-xl font-bold text-white">{serviceName}</p>
              </div>
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <p className="text-gray-400 mb-2">
              Uma confirmação foi enviada para seu WhatsApp
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="space-y-3"
          >
            <button
              onClick={onRestart}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-all text-white"
              style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`,
                  boxShadow: `0 0 40px ${primaryColor}60`
              }}
            >
              Agendar Outro
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
