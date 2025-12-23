import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Copy, Smartphone, CreditCard, Lock, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

interface Branding {
    primaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
    shopName?: string;
}

interface PaymentStepProps {
  onBack: () => void;
  onConfirm: (method: 'pix' | 'counter') => void;
  serviceName: string;
  servicePrice: number;
  dateStr: string;
  timeStr: string;
  barberName: string;
  pixCode?: string; // Optional for when PIX is generated
  isProcessing: boolean;
  branding?: Branding;
}

export function PaymentStep({ 
    onBack, 
    onConfirm, 
    serviceName, 
    servicePrice, 
    dateStr, 
    timeStr, 
    barberName,
    pixCode,
    isProcessing,
    branding
}: PaymentStepProps) {
  
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'counter' | null>(null);
  const primaryColor = branding?.primaryColor || '#7C3AED';

  const handleCopyPix = () => {
    if (pixCode) {
        navigator.clipboard.writeText(pixCode);
        toast.success('Código PIX copiado!');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 flex flex-col">
       {/* Header */}
       <div className="px-6 pt-8 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` }}
            >
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Finalização</p>
              <h1 
                className="text-2xl font-black text-transparent bg-clip-text"
                style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}
              >
                PAGAMENTO
              </h1>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 flex-1 space-y-6">
        {/* Order Summary */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10"
        >
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 border-b border-white/10 pb-2">Resumo do Pedido</h3>
            
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-gray-300">{serviceName}</span>
                    <span className="font-bold">R$ {servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                    <span>Profissional</span>
                    <span>{barberName}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                    <span>Data</span>
                    <span>{dateStr} às {timeStr}</span>
                </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="font-bold text-lg">Total a Pagar</span>
                <span className="text-2xl font-black text-[#10B981]">R$ {servicePrice.toFixed(2)}</span>
            </div>
        </motion.div>

        {/* Payment Methods */}
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Escolha a forma de pagamento</h3>
            
            <motion.button
                onClick={() => setSelectedMethod('pix')}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selectedMethod === 'pix' ? 'border-[#10B981] bg-[#10B981]/10' : 'border-white/10 bg-white/5'}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold">Pagar com PIX</p>
                        <p className="text-xs text-gray-400">Aprovação imediata</p>
                    </div>
                </div>
                {selectedMethod === 'pix' && <CheckCircle2 className="w-6 h-6 text-[#10B981]" />}
            </motion.button>

            <motion.button
                onClick={() => setSelectedMethod('counter')}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selectedMethod === 'counter' ? 'bg-opacity-10' : 'border-white/10 bg-white/5'}`}
                style={selectedMethod === 'counter' ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}10`
                } : {}}
            >
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                    >
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold">Pagar na Barbearia</p>
                        <p className="text-xs text-gray-400">Cartão ou Dinheiro</p>
                    </div>
                </div>
                {selectedMethod === 'counter' && <CheckCircle2 className="w-6 h-6" style={{ color: primaryColor }} />}
            </motion.button>
        </div>

        {/* PIX QR CODE DISPLAY */}
        <AnimatePresence>
            {selectedMethod === 'pix' && pixCode && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center">
                        <QRCodeSVG value={pixCode} size={200} />
                        <p className="text-black font-bold mt-4 text-center">Escaneie o QR Code</p>
                        <button 
                            onClick={handleCopyPix}
                            className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <Copy className="w-4 h-4" /> Copiar Código
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Footer Action */}
      <div className="p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent sticky bottom-0 z-50">
        <motion.button
          onClick={() => selectedMethod && onConfirm(selectedMethod)}
          disabled={!selectedMethod || isProcessing}
          whileTap={!isProcessing ? { scale: 0.98 } : {}}
          className={`
            w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all
            ${!selectedMethod ? 'bg-gray-900 text-gray-600 cursor-not-allowed' : 'text-white'}
          `}
          style={selectedMethod && !isProcessing ? {
              background: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`,
              boxShadow: `0 0 40px ${primaryColor}60`
          } : {}}
        >
          {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processando...
              </>
          ) : (
              <>
                <Lock className="w-5 h-5" /> 
                {selectedMethod === 'pix' && !pixCode ? 'GERAR PIX' : 'FINALIZAR AGENDAMENTO'}
              </>
          )}
        </motion.button>
      </div>

    </div>
  );
}
