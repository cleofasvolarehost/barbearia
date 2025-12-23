import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PaymentQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixCode: string;
  pixCodeBase64?: string;
  expiresAt: Date;
  onPaymentConfirmed: () => void;
}

export function PaymentQRCodeModal({ 
  isOpen, 
  onClose, 
  pixCode, 
  pixCodeBase64,
  expiresAt,
  onPaymentConfirmed 
}: PaymentQRCodeModalProps) {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [copied, setCopied] = useState(false);

  // Timer Countdown
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código Pix copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          >
            <div className="bg-[#121212] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#009EE3]/10 flex items-center justify-center mb-4">
                   <img src="https://logospng.org/download/pix/logo-pix-icone-1024.png" className="w-8 h-8 opacity-80" alt="Pix" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Pagamento via Pix</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Escaneie o QR Code ou copie o código abaixo para pagar.
                  <br />
                  <span className="text-yellow-500 font-bold">Expira em {formatTime(timeLeft)}</span>
                </p>

                <div className="bg-white p-4 rounded-xl mb-6 shadow-inner">
                  {pixCodeBase64 ? (
                      <img src={`data:image/png;base64,${pixCodeBase64}`} alt="QR Code Pix" className="w-48 h-48 object-contain" />
                  ) : (
                      <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          QR Code Indisponível
                      </div>
                  )}
                </div>

                <div className="w-full relative mb-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 pr-12 text-left">
                    <p className="text-white/60 text-xs font-mono truncate">{pixCode}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-[#009EE3]" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Aguardando confirmação automática...
                </div>

                <button
                  onClick={onPaymentConfirmed} // In a real scenario this would be automatic via socket/polling
                  className="w-full py-3 rounded-xl bg-[#009EE3] hover:bg-[#008CC9] text-white font-bold transition-colors"
                >
                  Já fiz o pagamento
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
