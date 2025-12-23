import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { Service } from '../../../types/database';

interface Branding {
    primaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
    shopName?: string;
}

interface ServiceSelectionProps {
  services: Service[];
  onSelect: (service: Service) => void;
  onBack: () => void;
  selectedServiceId?: string;
  branding?: Branding;
}

export function ServiceSelection({ services, onSelect, onBack, selectedServiceId, branding }: ServiceSelectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedServiceId || null);
  const primaryColor = branding?.primaryColor || '#7C3AED';

  const handleToggleService = (id: string) => {
    setSelectedId(id);
  };

  const handleContinue = () => {
    if (selectedId) {
        const service = services.find(s => s.id === selectedId);
        if (service) onSelect(service);
    }
  };

  const selectedService = services.find(s => s.id === selectedId);
  
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
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Passo 2 de 3</p>
              <h1 
                className="text-2xl font-black text-transparent bg-clip-text"
                style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}
              >
                ESCOLHA O SERVIÇO
              </h1>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Services Grid */}
      <div className="px-6 flex-1">
        <div className="grid grid-cols-2 gap-4">
          {services.map((service, index) => {
            const isSelected = selectedId === service.id;

            return (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleToggleService(service.id)}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-6 rounded-3xl transition-all overflow-hidden text-left
                  ${isSelected ? 'shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'hover:scale-[1.02]'}
                `}
                style={{
                  gridColumn: services.length % 2 !== 0 && index === services.length - 1 ? 'span 2' : 'auto',
                  boxShadow: isSelected ? `0 0 30px ${primaryColor}60` : 'none'
                }}
              >
                {/* Glassmorphism Background */}
                <div
                  className={`
                    absolute inset-0 backdrop-blur-xl border-2 rounded-3xl transition-all
                    ${isSelected ? 'bg-gradient-to-br' : 'border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]'}
                  `}
                  style={isSelected ? {
                      borderColor: primaryColor,
                      backgroundImage: `linear-gradient(135deg, ${primaryColor}30, transparent)`
                  } : {}}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Icon */}
                  <div
                    className={`
                      w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto
                      ${isSelected ? 'shadow-[0_0_20px_rgba(0,0,0,0.6)]' : ''}
                    `}
                    style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
                        boxShadow: isSelected ? `0 0 20px ${primaryColor}60` : 'none'
                    }}
                  >
                    <Scissors className="w-8 h-8 text-white" />
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-black text-white mb-1 text-center">
                    {service.nome}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-400 mb-4 text-center line-clamp-2 min-h-[2.5em]">{service.descricao || 'Serviço especializado'}</p>

                  {/* Duration */}
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{service.duracao_minutos} min</span>
                  </div>

                  {/* Price Pill */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={isSelected ? {
                              boxShadow: [
                                `0 0 10px ${primaryColor}40`,
                                `0 0 20px ${primaryColor}80`,
                                `0 0 10px ${primaryColor}40`,
                              ],
                            } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`
                        px-4 py-2 rounded-full font-black text-sm
                        ${isSelected ? 'text-white' : 'bg-white/10 text-gray-300'}
                      `}
                      style={isSelected ? {
                          background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}DD)`
                      } : {}}
                    >
                      R$ {service.preco.toFixed(2)}
                    </motion.div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})`,
                          boxShadow: `0 0 15px ${primaryColor}CC`
                      }}
                    >
                      <Scissors className="w-4 h-4 text-white" />
                    </motion.div>
                  )}

                  {/* Scan Line Effect for Selected */}
                  {isSelected && (
                    <motion.div
                      animate={{ y: [0, 100, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-x-0 h-0.5 opacity-50 pointer-events-none"
                      style={{ 
                          top: 0,
                          background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`
                      }}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Summary Bar - Fixed Bottom */}
      {selectedService && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-50"
        >
          {/* Summary Info */}
          <div className="mb-4 p-4 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Serviço:</span>
              <span className="font-bold text-white">{selectedService.nome}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Duração:</span>
              <span className="font-bold text-white">{selectedService.duracao_minutos} min</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="font-bold text-white">Total:</span>
              <span 
                className="text-2xl font-black text-transparent bg-clip-text"
                style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}
              >
                R$ {selectedService.preco.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Continue Button */}
          <motion.button
            onClick={handleContinue}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all"
            style={{
                background: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`,
                boxShadow: `0 0 40px ${primaryColor}60`
            }}
          >
            <span>CONTINUAR PARA HORÁRIO</span>
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* Hint when nothing selected */}
      {!selectedService && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-6 left-6 right-6"
        >
          <div 
            className="p-3 rounded-xl border"
            style={{
                backgroundColor: `${primaryColor}10`,
                borderColor: `${primaryColor}20`
            }}
          >
            <p className="text-xs text-center text-gray-400">
              💡 <span className="text-white font-semibold">Dica:</span> Selecione um serviço para continuar
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
