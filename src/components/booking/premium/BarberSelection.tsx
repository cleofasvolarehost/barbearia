import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight, Scissors, User } from 'lucide-react';
import { Barber } from '../../../types/database';

interface Branding {
    primaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
    shopName?: string;
}

interface BarberSelectionProps {
  barbers: Barber[];
  onSelect: (barber: Barber) => void;
  selectedBarberId?: string;
  branding?: Branding;
}

export function BarberSelection({ barbers, onSelect, selectedBarberId, branding }: BarberSelectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedBarberId || null);
  
  const primaryColor = branding?.primaryColor || '#7C3AED';

  const handleSelect = (barber: Barber) => {
    setSelectedId(barber.id);
  };

  const handleConfirm = () => {
    if (selectedId) {
        const barber = barbers.find(b => b.id === selectedId);
        if (barber) onSelect(barber);
    }
  };

  const getLevel = (index: number) => index === 0 ? 'MASTER' : 'PRO';
  const getRating = (index: number) => (5.0 - (index * 0.1)).toFixed(1);
  const getSpecialty = (index: number) => ['Fade Expert', 'Beard Sculptor', 'Classic Cuts', 'Modern Style'][index % 4];

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 relative">
         {branding?.bannerUrl && (
             <div className="absolute inset-0 opacity-20">
                 <img src={branding.bannerUrl} alt="Banner" className="w-full h-full object-cover mask-image-gradient" />
                 <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
             </div>
         )}
         
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-white/5"
                style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` 
                }}
            >
              {branding?.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                  <Scissors className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Passo 1 de 3</p>
              <h1 
                className="text-2xl font-black text-transparent bg-clip-text"
                style={{ 
                    backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` 
                }}
              >
                ESCOLHA O BARBEIRO
              </h1>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="px-6 pb-8 flex-1">
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory h-full items-center">
          {barbers.map((barber, index) => {
            const isSelected = selectedId === barber.id;
            const level = getLevel(index);
            const rating = getRating(index);
            const specialty = getSpecialty(index);

            return (
              <motion.div
                key={barber.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="snap-center flex-shrink-0 first:ml-0"
                style={{ width: '280px' }}
              >
                <motion.button
                  onClick={() => handleSelect(barber)}
                  whileTap={{ scale: 0.98 }}
                  animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
                  className={`
                    w-full relative rounded-3xl overflow-hidden border-2 transition-all text-left
                    ${isSelected ? 'shadow-[0_0_40px_rgba(0,0,0,0.6)]' : 'border-white/10'}
                  `}
                  style={{
                      borderColor: isSelected ? primaryColor : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 40px ${primaryColor}60` : 'none'
                  }}
                >
                  {/* Animated Glow Background */}
                  {isSelected && (
                    <motion.div
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0"
                      style={{
                          background: `linear-gradient(135deg, ${primaryColor}40, transparent)`
                      }}
                    />
                  )}

                  {/* Level Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <div
                      className="px-3 py-1 rounded-full backdrop-blur-xl border text-xs font-black tracking-wider"
                      style={{
                          backgroundColor: `${primaryColor}20`,
                          borderColor: `${primaryColor}50`,
                          color: primaryColor
                      }}
                    >
                      {level}
                    </div>
                  </div>

                  {/* Barber Photo */}
                  <div className="relative h-80 bg-gray-900">
                    {barber.foto_url ? (
                        <img
                        src={barber.foto_url}
                        alt={barber.nome}
                        className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-24 h-24 text-gray-700" />
                        </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                  </div>

                  {/* Info Section */}
                  <div className="relative p-5 bg-gradient-to-b from-black/50 to-black/80 backdrop-blur-xl">
                    {/* Name */}
                    <h3 className="text-xl font-black mb-1 text-white tracking-tight">
                      {barber.nome}
                    </h3>

                    {/* Specialty */}
                    <p className="text-sm text-gray-400 mb-3">{specialty}</p>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(Number(rating))
                              ? 'fill-white text-white'
                              : 'text-gray-600'
                          }`}
                          style={{
                              color: i < Math.floor(Number(rating)) ? primaryColor : undefined,
                              fill: i < Math.floor(Number(rating)) ? primaryColor : undefined
                          }}
                        />
                      ))}
                      <span className="ml-2 text-sm font-bold text-white">{rating}</span>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})`,
                            boxShadow: `0 0 20px ${primaryColor}CC`
                        }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                          className="w-8 h-8 rounded-full border-2 border-dashed border-white/50"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Scan Line Effect for Selected */}
                  {isSelected && (
                    <motion.div
                      animate={{ y: [0, 320, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-x-0 h-1 opacity-50 pointer-events-none"
                      style={{ 
                          top: 0,
                          background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`
                      }}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center">
            <p className="text-2xl font-black" style={{ color: primaryColor }}>{barbers.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Disponíveis</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center">
            <p className="text-2xl font-black text-[#10B981]">4.9</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avaliação</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center">
            <p className="text-2xl font-black text-white">1.2k</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Reviews</p>
          </div>
        </motion.div>
      </div>

      {/* Continue Button - Fixed Bottom */}
      <div className="p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent sticky bottom-0 z-50">
        <motion.button
          onClick={handleConfirm}
          disabled={!selectedId}
          whileTap={selectedId ? { scale: 0.98 } : {}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`
            w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all
            ${!selectedId ? 'bg-gray-900 text-gray-600 cursor-not-allowed' : 'text-white'}
          `}
          style={selectedId ? {
              background: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`,
              boxShadow: `0 0 40px ${primaryColor}60`
          } : {}}
        >
          <span>{selectedId ? 'CONTINUAR' : 'SELECIONE UM BARBEIRO'}</span>
          {selectedId && <ChevronRight className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );
}
