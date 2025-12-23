import React, { useState } from 'react';
import { Plus, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';

interface FloatingActionButtonProps {
  onAddClient: () => void;
}

export function FloatingActionButton({ onAddClient }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    service: '',
    professional: '',
  });

  const handleQuickAdd = () => {
    setShowModal(true);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding walk-in client:', formData);
    setShowModal(false);
    setFormData({ name: '', service: '', professional: '' });
    onAddClient();
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleQuickAdd}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#7C3AED] text-white backdrop-blur-xl shadow-[0_8px_32px_0_rgba(124,58,237,0.4)] hover:shadow-[0_8px_32px_0_rgba(124,58,237,0.6)] transition-all whitespace-nowrap"
              >
                <User className="w-5 h-5" />
                <span>Cliente Avulso</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] text-white shadow-[0_8px_32px_0_rgba(124,58,237,0.5)] flex items-center justify-center hover:shadow-[0_12px_48px_0_rgba(124,58,237,0.7)] transition-all"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="w-8 h-8" />
          </motion.div>
        </motion.button>
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md"
              >
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl text-white">Adicionar Cliente Avulso</h3>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-white/60 mb-2 text-sm">Nome do Cliente</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                        placeholder="Digite o nome do cliente"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white/60 mb-2 text-sm">Serviço</label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                        required
                      >
                        <option value="" className="bg-[#121212]">Selecione um serviço</option>
                        <option value="haircut" className="bg-[#121212]">Corte de Cabelo</option>
                        <option value="beard" className="bg-[#121212]">Barba</option>
                        <option value="color" className="bg-[#121212]">Tintura</option>
                        <option value="styling" className="bg-[#121212]">Penteado</option>
                        <option value="full-service" className="bg-[#121212]">Serviço Completo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/60 mb-2 text-sm">Profissional</label>
                      <select
                        value={formData.professional}
                        onChange={(e) => setFormData({ ...formData, professional: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                        required
                        onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Por favor, selecione um profissional.')}
                        onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                      >
                        <option value="" className="bg-[#121212]">Selecione um profissional</option>
                        <option value="john" className="bg-[#121212]">João</option>
                        <option value="emma" className="bg-[#121212]">Ema</option>
                        <option value="sofia" className="bg-[#121212]">Sofia</option>
                        <option value="marcus" className="bg-[#121212]">Marcos</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white hover:shadow-[0_8px_32px_0_rgba(124,58,237,0.4)] transition-all"
                      >
                        Adicionar
                      </button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
