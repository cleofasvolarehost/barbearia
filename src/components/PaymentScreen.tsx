import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { QrCode, Copy, Check, MessageCircle, ArrowLeft, Timer, Sparkles } from 'lucide-react';

export type PaymentMethod = 'pix-auto' | 'pix-manual' | 'in-person' | null;

interface PaymentScreenProps {
  method: PaymentMethod;
  onBack: () => void;
  pixKey?: string;
  amount: number;
  serviceName: string;
  barberName?: string;
  barberAvatar?: string;
  onSuccess?: () => void;
}

export function PaymentScreen({ 
  method, 
  onBack, 
  pixKey = '', 
  amount, 
  serviceName,
  barberName = 'Barbeiro',
  barberAvatar,
  onSuccess
}: PaymentScreenProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos

  // Timer countdown
  useEffect(() => {
    if (method === 'pix-auto' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [method, timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock Pix Code for Gateway Simulation
  const pixCode = '00020126580014BR.GOV.BCB.PIX0136a1b2c3d4-e5f6-7890-ab12-cd34ef567890520400005303986540550.005802BR5925BARBEARIA NEXTLEVEL6009SAO PAULO62070503***6304ABCD';

  if (method === 'pix-auto') {
    return (
      <div className="min-h-[60vh] bg-[#050505] text-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#050505]/95 backdrop-blur-md pb-4 border-b border-white/5 shadow-xl">
          <div className="px-4 pt-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#32BCAD] to-[#2DD4BF] flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.4)]"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 353.7 407.2 339.5 421.4C325.3 435.6 301.8 435.6 287.6 421.4L210.6 344.4C205.2 339 205.2 329.7 210.6 324.3L242.4 292.5ZM262.5 219.5C257.1 224.9 247.8 224.9 242.4 219.5L165.4 142.5C151.2 128.3 151.2 104.8 165.4 90.6C179.6 76.4 203.1 76.4 217.3 90.6L294.3 167.6C299.7 173 299.7 182.3 294.3 187.7L262.5 219.5ZM384 262.5C378.6 257.1 378.6 247.8 384 242.4L461 165.4C475.2 151.2 498.7 151.2 512.9 165.4C527.1 179.6 527.1 203.1 512.9 217.3L435.9 294.3C430.5 299.7 421.2 299.7 415.8 294.3L384 262.5zM90.6 294.3C76.4 280.1 76.4 256.6 90.6 242.4L167.6 165.4C173 160 182.3 160 187.7 165.4L219.5 197.2C224.9 202.6 224.9 211.9 219.5 217.3L142.5 294.3C128.3 308.5 104.8 308.5 90.6 294.3z" />
                </svg>
              </motion.div>

              <div className="flex flex-col items-center gap-1">
                 <h1 className="text-xl font-black text-white">Pix Automático</h1>
                 <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30"
                  >
                    <Timer className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-bold text-orange-400">
                      Expira em: {formatTime(timeLeft)}
                    </span>
                  </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-24 pt-6 max-w-md mx-auto w-full flex-1 overflow-y-auto">
          <p className="text-xs text-center text-gray-500 mb-6">Escaneie o QR Code ou copie o código abaixo</p>

          {/* QR Code Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="relative p-6 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20">
              {/* Decorative corners */}
              <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#7C3AED]" />
              <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#7C3AED]" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#7C3AED]" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#7C3AED]" />

              {/* QR Code (Mock) */}
              <div className="bg-white p-6 rounded-2xl mx-auto w-fit">
                <QrCode className="w-48 h-48 text-black" strokeWidth={0.5} />
              </div>

              {/* Scanning animation */}
              <motion.div
                animate={{ y: [0, 200, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-x-0 mx-6 h-1 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-50"
                style={{ top: '2.5rem' }}
              />
            </div>
          </motion.div>

          {/* Amount Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/30 mb-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Valor a pagar</span>
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">
                R$ {amount.toFixed(2)}
              </span>
            </div>
          </motion.div>

          {/* Copy Code Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => handleCopy(pixCode)}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all font-bold flex items-center justify-center gap-2 mb-4"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                <span>Código Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copiar Código Pix</span>
              </>
            )}
          </motion.button>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" />
              Como pagar
            </h3>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">1.</span>
                <span>Abra o app do seu banco</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">2.</span>
                <span>Escolha pagar com Pix QR Code</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">3.</span>
                <span>Escaneie o código ou cole o código copiado</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">4.</span>
                <span>Confirme o pagamento de R$ {amount.toFixed(2)}</span>
              </li>
            </ol>
          </motion.div>

          {/* Status Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-3 rounded-xl bg-gradient-to-r from-[#10B981]/10 to-[#14B8A6]/10 border border-[#10B981]/20"
          >
            <p className="text-xs text-center text-gray-300">
              ⚡ <span className="text-[#10B981] font-semibold">Pagamento detectado automaticamente!</span> Você será notificado em instantes.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (method === 'pix-manual') {
    return (
      <div className="min-h-[60vh] bg-[#050505] text-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-[#050505] to-transparent pb-4">
          <div className="px-4 pt-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)]"
              >
                <Copy className="w-8 h-8 text-white" />
              </motion.div>

              <h1 className="text-3xl font-black mb-2">Pix Manual</h1>
              <p className="text-sm text-gray-400">Envie o pagamento para a chave abaixo</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-20 max-w-md mx-auto w-full flex-1">
          {/* Barber Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 p-6 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20"
          >
            <div className="flex items-center gap-4 mb-6">
              {barberAvatar ? (
                  <img
                    src={barberAvatar}
                    alt={barberName}
                    className="w-16 h-16 rounded-full ring-2 ring-[#7C3AED]"
                  />
              ) : (
                  <div className="w-16 h-16 rounded-full ring-2 ring-[#7C3AED] bg-gray-800 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{barberName.charAt(0)}</span>
                  </div>
              )}
              <div>
                <h3 className="font-bold text-white">{barberName}</h3>
                <p className="text-sm text-gray-400">Profissional</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Chave Pix</label>
                <div className="mt-1 p-4 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/30 flex items-center justify-between">
                  <span className="text-lg font-black text-white tracking-wider break-all">{pixKey || 'Chave não configurada'}</span>
                </div>
              </div>

              <motion.button
                onClick={() => handleCopy(pixKey)}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-4 rounded-xl bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 border border-[#7C3AED]/50 transition-all font-semibold flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[#10B981]">Chave Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Chave</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Amount */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/30 mb-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Valor a transferir</span>
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">
                R$ {amount.toFixed(2)}
              </span>
            </div>
          </motion.div>

          {/* Send Receipt Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => {
              const message = encodeURIComponent(
                `✅ Comprovante do pagamento via Pix\n\nServiço: ${serviceName}\nValor: R$ ${amount.toFixed(2)}\n\n[Anexar comprovante]`
              );
              // Use a generic phone or the one from settings if available (not passed yet, but generic for now)
              window.open(`https://wa.me/?text=${message}`, '_blank');
              if (onSuccess) onSuccess();
            }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#14B8A6] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all font-bold flex items-center justify-center gap-2 mb-4"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Enviar Comprovante no WhatsApp</span>
          </motion.button>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" />
              Instruções
            </h3>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">1.</span>
                <span>Copie a chave Pix acima</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">2.</span>
                <span>Abra o app do seu banco e faça a transferência</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">3.</span>
                <span>Tire um print ou salve o comprovante</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#7C3AED] font-bold">4.</span>
                <span>Clique no botão verde para enviar no WhatsApp</span>
              </li>
            </ol>
          </motion.div>
        </div>
      </div>
    );
  }

  // In-person payment
  return (
    <div className="min-h-[60vh] bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-3xl font-black mb-3">Agendamento Confirmado!</h1>
          <p className="text-gray-400 mb-6">
            Você optou por pagar na barbearia. Leve dinheiro ou cartão no dia do serviço.
          </p>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/30 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Serviço</span>
              <span className="text-sm text-white font-semibold">{serviceName}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="font-bold text-white">Valor a pagar</span>
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">
                R$ {amount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-r from-[#10B981]/10 to-[#14B8A6]/10 border border-[#10B981]/20 cursor-pointer" onClick={onSuccess}>
            <p className="text-xs text-gray-300">
              ✅ <span className="text-[#10B981] font-semibold">Tudo pronto!</span> Clique para fechar.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
