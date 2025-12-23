import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronRight, ArrowLeft } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Branding {
    primaryColor: string;
    logoUrl?: string;
    bannerUrl?: string;
    shopName?: string;
}

interface TimeSelectionProps {
  onConfirm: (time: string, date: Date) => void;
  onBack: () => void;
  availableSlots: string[]; // ['09:00', '10:00']
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  branding?: Branding;
}

export function TimeSelection({ onConfirm, onBack, availableSlots, selectedDate, onDateChange, branding }: TimeSelectionProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const primaryColor = branding?.primaryColor || '#7C3AED';

  // Generate next 14 days
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));

  const handleConfirm = () => {
    if (selectedTime) {
      onConfirm(selectedTime, selectedDate);
    }
  };

  // Reset time when date changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-48 flex flex-col">
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
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Passo 3 de 3</p>
              <h1 
                className="text-2xl font-black text-transparent bg-clip-text"
                style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}
              >
                DATA E HORÁRIO
              </h1>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Date Selection */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Selecione a Data</h3>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const dayName = format(date, 'EEE', { locale: ptBR }).toUpperCase();
            const dayNumber = format(date, 'dd');
            const monthName = format(date, 'MMM', { locale: ptBR });
            
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onDateChange(date)}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex-shrink-0 px-6 py-4 rounded-2xl transition-all border-2 min-w-[100px]
                  ${isSelected ? 'shadow-[0_0_30px_rgba(0,0,0,0.4)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}
                `}
                style={isSelected ? {
                    borderColor: primaryColor,
                    background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`,
                    boxShadow: `0 0 30px ${primaryColor}40`
                } : {}}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{dayName}</p>
                <p className="text-2xl font-black text-white mb-1">{dayNumber}</p>
                <p className="text-xs text-gray-400 capitalize">{monthName}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Available Slots Stats */}
      <div className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#10B981]/10 to-transparent border border-[#10B981]/30 text-center">
            <p className="text-xl font-black text-[#10B981]">
              {availableSlots.length}
            </p>
            <p className="text-xs text-gray-500 uppercase">Horários Livres</p>
          </div>
          
          <div 
            className="p-3 rounded-xl bg-gradient-to-br to-transparent border text-center"
            style={{
                borderColor: `${primaryColor}30`,
                backgroundColor: `${primaryColor}10`
            }}
          >
            <p className="text-xl font-black" style={{ color: primaryColor }}>Agenda</p>
            <p className="text-xs text-gray-500 uppercase">Aberta</p>
          </div>
        </motion.div>
      </div>

      {/* Time Slots Grid */}
      <div className="px-6 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#10B981]" />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Horários Disponíveis</h3>
        </div>

        {availableSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Clock className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Nenhum horário disponível</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                    Não encontramos horários livres para esta data. Tente selecionar outro dia no calendário acima.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-3 gap-3">
            {availableSlots.map((time, index) => {
                const isSelected = selectedTime === time;

                return (
                <motion.button
                    key={time}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setSelectedTime(time)}
                    whileTap={{ scale: 0.95 }}
                    className={`
                    relative p-4 rounded-2xl font-bold transition-all overflow-hidden
                    ${isSelected ? 'text-white shadow-[0_0_25px_rgba(0,0,0,0.6)]' : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 text-white hover:bg-white/15'}
                    `}
                    style={isSelected ? {
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}DD)`,
                        boxShadow: `0 0 25px ${primaryColor}60`
                    } : {
                        borderColor: 'rgba(255,255,255,0.2)'
                    }}
                >
                    {/* Time */}
                    <div className="relative z-10 text-sm">{time}</div>

                    {/* Selected Pulse */}
                    {isSelected && (
                    <motion.div
                        animate={{
                        scale: [1, 1.5, 1.5],
                        opacity: [0.5, 0, 0],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-2xl"
                        style={{ backgroundColor: primaryColor }}
                    />
                    )}

                    {/* Scan line for available slots */}
                    {isSelected === false && (
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                        delay: index * 0.1,
                        }}
                        className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    />
                    )}
                </motion.button>
                );
            })}
            </div>
        )}
      </div>

      {/* Time Ribbon - Fixed Bottom */}
      <AnimatePresence>
        {selectedTime && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-50"
          >
            {/* Selection Summary */}
            <div 
                className="mb-4 p-5 rounded-2xl backdrop-blur-xl border-2"
                style={{
                    background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`,
                    borderColor: primaryColor
                }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Seu Agendamento</p>
                  <p className="text-lg font-black text-white capitalize">
                    {format(selectedDate, "EEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Horário</p>
                  <p 
                    className="text-3xl font-black text-transparent bg-clip-text"
                    style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}
                  >
                    {selectedTime}
                  </p>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full"
                  style={{ background: `linear-gradient(to right, ${primaryColor}, #ffffff)` }}
                />
              </div>
            </div>

            {/* Confirm Button */}
            <motion.button
              onClick={handleConfirm}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all"
              style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`,
                  boxShadow: `0 0 50px ${primaryColor}80`
              }}
            >
              <span>CONFIRMAR AGENDAMENTO</span>
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
