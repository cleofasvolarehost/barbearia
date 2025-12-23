import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, CreditCard, User, Mail, Phone, ChevronDown, ChevronUp, Check, Zap, Calendar } from 'lucide-react';

type PaymentMethod = 'pix' | 'credit';

interface OnePageCheckoutProps {
  isLoggedIn?: boolean;
  prefilledData?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export function OnePageCheckout({ isLoggedIn = false, prefilledData }: OnePageCheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [expandedMethod, setExpandedMethod] = useState<PaymentMethod>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: prefilledData?.name || '',
    email: prefilledData?.email || '',
    phone: prefilledData?.phone || '',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
  });

  const planPrice = 97.0;
  const pixDiscount = 10; // 10% desconto no Pix
  const pixPrice = planPrice * (1 - pixDiscount / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(true);
    }, 2000);
  };

  const toggleMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setExpandedMethod(method);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* HEADER - Trust Anchor */}
      <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#10B981] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-black">NextLevel</span>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30">
              <Lock className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-xs font-bold text-[#10B981]">Ambiente Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-md mx-auto px-6 py-8 pb-40">
        {/* THE "HERO" PRODUCT CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative p-6 rounded-3xl bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-white/10 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/5 to-[#10B981]/5" />
            
            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700]/50 mb-4">
                <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                <span className="text-xs font-black text-[#FFD700]">7 DIAS DE GARANTIA</span>
              </div>

              {/* Plan Name */}
              <h2 className="text-2xl font-black text-white mb-2">Plano Mensal Pro</h2>
              
              {/* Benefits List */}
              <ul className="space-y-2 mb-5">
                {[
                  'Agendamento ilimitado',
                  'Dashboard analytics completo',
                  'Marketing & Fidelidade',
                  'Suporte prioritário 24/7',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#10B981]" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#10B981]">
                    R$ {planPrice.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-400 pb-2">/mês</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cobrado mensalmente • Cancele quando quiser</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAST INPUTS (The Form) */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Seus Dados</h3>
            
            <div className="space-y-3">
              {/* Name */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] focus:bg-white/10 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* PAYMENT SELECTOR (Accordion Style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Forma de Pagamento</h3>

          <div className="space-y-3">
            {/* PIX OPTION - DEFAULT HIGHLIGHTED */}
            <div
              className={`
                relative rounded-2xl overflow-hidden transition-all border-2
                ${
                  selectedMethod === 'pix'
                    ? 'border-[#10B981] shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    : 'border-white/10'
                }
              `}
            >
              {/* Header */}
              <button
                onClick={() => toggleMethod('pix')}
                className="w-full p-4 flex items-center gap-4 bg-gradient-to-br from-white/5 to-transparent"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 512 512" fill="currentColor">
                    <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 353.7 407.2 339.5 421.4C325.3 435.6 301.8 435.6 287.6 421.4L210.6 344.4C205.2 339 205.2 329.7 210.6 324.3L242.4 292.5ZM262.5 219.5C257.1 224.9 247.8 224.9 242.4 219.5L165.4 142.5C151.2 128.3 151.2 104.8 165.4 90.6C179.6 76.4 203.1 76.4 217.3 90.6L294.3 167.6C299.7 173 299.7 182.3 294.3 187.7L262.5 219.5ZM384 262.5C378.6 257.1 378.6 247.8 384 242.4L461 165.4C475.2 151.2 498.7 151.2 512.9 165.4C527.1 179.6 527.1 203.1 512.9 217.3L435.9 294.3C430.5 299.7 421.2 299.7 415.8 294.3L384 262.5zM90.6 294.3C76.4 280.1 76.4 256.6 90.6 242.4L167.6 165.4C173 160 182.3 160 187.7 165.4L219.5 197.2C224.9 202.6 224.9 211.9 219.5 217.3L142.5 294.3C128.3 308.5 104.8 308.5 90.6 294.3z" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white">Pix</h4>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50">
                      APROVAÇÃO IMEDIATA
                    </span>
                  </div>
                  <p className="text-sm text-[#10B981] font-semibold">{pixDiscount}% de desconto • R$ {pixPrice.toFixed(2)}</p>
                </div>

                {/* Chevron */}
                {expandedMethod === 'pix' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedMethod === 'pix' && selectedMethod === 'pix' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-white/10">
                      <div className="p-4 rounded-xl bg-white/5 text-center">
                        <Zap className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          QR Code será gerado após confirmação
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CREDIT CARD OPTION */}
            <div
              className={`
                relative rounded-2xl overflow-hidden transition-all border-2
                ${
                  selectedMethod === 'credit'
                    ? 'border-[#7C3AED] shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                    : 'border-white/10'
                }
              `}
            >
              {/* Header */}
              <button
                onClick={() => toggleMethod('credit')}
                className="w-full p-4 flex items-center gap-4 bg-gradient-to-br from-white/5 to-transparent"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-white mb-1">Cartão de Crédito</h4>
                  <div className="flex items-center gap-2">
                    {/* Card Logos */}
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/American_Express_logo_%282018%29.svg" alt="Amex" className="h-4" />
                  </div>
                </div>

                {/* Chevron */}
                {expandedMethod === 'credit' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedMethod === 'credit' && selectedMethod === 'credit' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-3 border-t border-white/10">
                      {/* Card Number */}
                      <input
                        type="text"
                        placeholder="Número do cartão"
                        maxLength={19}
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] transition-all"
                      />

                      {/* Card Name */}
                      <input
                        type="text"
                        placeholder="Nome no cartão"
                        value={formData.cardName}
                        onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] transition-all"
                      />

                      {/* Expiry & CVV */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="MM/AA"
                            maxLength={5}
                            value={formData.cardExpiry}
                            onChange={(e) => setFormData({ ...formData, cardExpiry: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] transition-all"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="CVV"
                          maxLength={4}
                          value={formData.cardCvv}
                          onChange={(e) => setFormData({ ...formData, cardCvv: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#7C3AED] transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-4 text-xs text-gray-600"
        >
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            <span>SSL 256-bit</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-700" />
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PCI Compliant</span>
          </div>
        </motion.div>
      </main>

      {/* STICKY FOOTER - The Conversion Trigger */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
        <div className="max-w-md mx-auto p-6">
          <motion.button
            onClick={handleSubmit}
            disabled={isProcessing}
            whileTap={!isProcessing ? { scale: 0.98 } : {}}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`
              w-full py-5 px-6 rounded-2xl font-black text-lg
              transition-all duration-300
              ${
                isProcessing
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 cursor-wait'
                  : selectedMethod === 'pix'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#14B8A6] hover:shadow-[0_0_50px_rgba(16,185,129,0.8)]'
                  : 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)]'
              }
            `}
            style={{
              boxShadow: !isProcessing
                ? selectedMethod === 'pix'
                  ? '0 0 40px rgba(16, 185, 129, 0.5)'
                  : '0 0 40px rgba(124, 58, 237, 0.5)'
                : undefined,
            }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Lock className="w-6 h-6" />
                </motion.div>
                <span>Processando...</span>
              </div>
            ) : (
              <span>Confirmar e Liberar Acesso Agora</span>
            )}
          </motion.button>

          {/* Subtext */}
          <p className="text-center text-xs text-gray-600 mt-3">
            Cancelamento grátis a qualquer momento
          </p>
        </div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    '0 0 40px rgba(16, 185, 129, 0.6)',
                    '0 0 80px rgba(16, 185, 129, 1)',
                    '0 0 40px rgba(16, 185, 129, 0.6)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] flex items-center justify-center"
              >
                <Check className="w-16 h-16 text-white" strokeWidth={3} />
              </motion.div>

              <h2 className="text-4xl font-black text-white mb-3">Bem-vindo ao Pro!</h2>
              <p className="text-lg text-gray-400 mb-6">Seu acesso foi liberado</p>

              {/* Particles */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 600,
                    y: (Math.random() - 0.5) * 600,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{ duration: 2, delay: i * 0.02 }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: ['#10B981', '#7C3AED', '#FFD700'][i % 3],
                    left: '50%',
                    top: '40%',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
