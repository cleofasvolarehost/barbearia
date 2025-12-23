import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Award, TrendingUp, ArrowLeft, Zap, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface LoyaltyCardProps {
  onBack?: () => void;
}

interface LoyaltyData {
  points: number;
  total_visits: number;
  rewards_redeemed: number;
  establishment: {
    name: string;
    primary_color?: string;
    secondary_color?: string;
  }
}

export function LoyaltyCard({ onBack }: LoyaltyCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [currentCuts, setCurrentCuts] = useState(0);
  const totalCuts = 10;
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchLoyaltyData();
  }, [user]);

  const fetchLoyaltyData = async () => {
    if (!user) return;
    try {
      const { data: cards, error } = await supabase
        .from('loyalty_cards')
        .select(`
          points,
          total_visits,
          rewards_redeemed,
          establishment:establishments(name, primary_color, secondary_color)
        `)
        .eq('user_id', user.id)
        .order('last_visit_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (cards && cards.length > 0) {
        const card = cards[0];
        setData({
          points: card.points,
          total_visits: card.total_visits,
          rewards_redeemed: card.rewards_redeemed,
          establishment: card.establishment
        });
        setCurrentCuts(card.points % totalCuts); // Modulo if points accumulate continuously? 
        // Or points reset? The schema says points default 0. 
        // Let's assume points are "current progress" and reset after redemption.
        // If trigger just adds points, we might need logic to reset.
        // For now, let's assume points <= 10. If > 10, it implies unredeemed rewards.
        
        const effectivePoints = card.points % totalCuts;
        const rewards = Math.floor(card.points / totalCuts) - (card.rewards_redeemed || 0);
        
        setCurrentCuts(effectivePoints === 0 && card.points > 0 && rewards > 0 ? totalCuts : effectivePoints); 
        // Logic: if 10 points, show full card.
      } else {
        // No card yet
        setData(null);
        setCurrentCuts(0);
      }
    } catch (error) {
      console.error('Error fetching loyalty card:', error);
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentCuts / totalCuts) * 100;
  const remaining = totalCuts - currentCuts;
  const isComplete = currentCuts === totalCuts;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 0% 0%, #10B981 0%, transparent 50%)',
              'radial-gradient(circle at 100% 100%, #14B8A6 0%, transparent 50%)',
              'radial-gradient(circle at 0% 100%, #10B981 0%, transparent 50%)',
              'radial-gradient(circle at 100% 0%, #14B8A6 0%, transparent 50%)',
              'radial-gradient(circle at 0% 0%, #10B981 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full"
        />
      </div>

      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  opacity: 1,
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 720 - 360,
                  opacity: 0,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  ease: 'easeOut',
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: ['#10B981', '#14B8A6', '#FFD700', '#FF6B9D'][Math.floor(Math.random() * 4)],
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 px-4 pt-6 pb-24 max-w-md mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={isComplete ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          >
            {isComplete ? (
              <Award className="w-8 h-8 text-white" />
            ) : (
              <Sparkles className="w-8 h-8 text-white" />
            )}
          </motion.div>
          
          <h1 className="text-3xl font-black mb-2">Cartão Fidelidade</h1>
          <p className="text-sm text-gray-400">
            {isComplete
              ? '🎉 Parabéns! Você ganhou um corte grátis!'
              : `Faltam apenas ${remaining} ${remaining === 1 ? 'corte' : 'cortes'} para seu prêmio!`}
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Glowing effect for complete card */}
          {isComplete && (
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(16, 185, 129, 0.3)',
                  '0 0 40px rgba(16, 185, 129, 0.6)',
                  '0 0 20px rgba(16, 185, 129, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl"
            />
          )}

          <div className="relative p-6 rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/20">
            {/* Progress Counter */}
            <div className="text-center mb-6">
              <motion.div
                key={currentCuts}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-block"
              >
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  {currentCuts}
                </span>
                <span className="text-3xl text-gray-500">/{totalCuts}</span>
              </motion.div>
              <p className="text-sm text-gray-400 mt-2">Cortes Completos</p>
            </div>

            {/* Punch Card Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[...Array(totalCuts)].map((_, index) => {
                const isFilled = index < currentCuts;
                const isJustFilled = index === currentCuts - 1 && isAnimating;

                return (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={
                      isJustFilled
                        ? {
                            scale: [1, 1.3, 1],
                            rotate: [0, 10, -10, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.6 }}
                    className="relative aspect-square"
                  >
                    {/* Slot Background */}
                    <div
                      className={`
                        w-full h-full rounded-xl border-2 transition-all duration-500
                        ${
                          isFilled
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            : 'bg-white/5 border-gray-700'
                        }
                      `}
                    >
                      {/* Checkmark or Number */}
                      <div className="w-full h-full flex items-center justify-center">
                        {isFilled ? (
                          <motion.svg
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: isJustFilled ? 0.3 : 0 }}
                            className="w-6 h-6 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </motion.svg>
                        ) : (
                          <span className="text-xs text-gray-600 font-bold">{index + 1}</span>
                        )}
                      </div>
                    </div>

                    {/* Sparkle effect for filled slots */}
                    {isFilled && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                        transition={{
                          duration: 1,
                          delay: isJustFilled ? 0.2 : 0,
                          repeat: isJustFilled ? 0 : Infinity,
                          repeatDelay: 2,
                        }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <Sparkles className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 relative"
                  style={{
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)',
                  }}
                >
                  {/* Animated shimmer */}
                  <motion.div
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                </motion.div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">{Math.round(progress)}% completo</p>
            </div>

            {/* Reward Section */}
            <div
              className={`
                p-4 rounded-2xl border-2 transition-all duration-500
                ${
                  isComplete
                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-400'
                    : 'bg-white/5 border-dashed border-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={isComplete ? { rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: isComplete ? Infinity : 0, repeatDelay: 3 }}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${
                      isComplete
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                        : 'bg-gray-800'
                    }
                  `}
                >
                  <Gift className={`w-6 h-6 ${isComplete ? 'text-white' : 'text-gray-600'}`} />
                </motion.div>
                <div className="flex-1">
                  <p className={`font-bold ${isComplete ? 'text-white' : 'text-gray-400'}`}>
                    {isComplete ? '🎉 Resgate Disponível!' : 'Seu Prêmio'}
                  </p>
                  <p className={`text-sm ${isComplete ? 'text-emerald-400' : 'text-gray-500'}`}>
                    1 Corte Grátis
                  </p>
                </div>
                {isComplete && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Button (Hidden for client, or show Redeem instructions) */}
        {isComplete && (
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
            >
             <button
            className={`
                w-full py-4 px-6 rounded-2xl font-bold
                flex items-center justify-center gap-2
                transition-all duration-300
                bg-gradient-to-r from-yellow-500 to-orange-500 hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]
            `}
            onClick={() => alert('Mostre este cartão ao seu barbeiro para resgatar!')}
            >
            <Award className="w-5 h-5" />
            <span>Resgatar Prêmio na Barbearia</span>
            </button>
            </motion.div>
        )}

        {/* Stats Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 grid grid-cols-2 gap-4"
        >
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-2xl font-black text-emerald-400">{data?.rewards_redeemed || 0}</p>
            <p className="text-xs text-gray-400">Prêmios Resgatados</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-2xl font-black text-teal-400">{data?.total_visits || 0}</p>
            <p className="text-xs text-gray-400">Cortes Totais</p>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
        >
          <p className="text-xs text-center text-gray-300">
            ✨ <span className="text-emerald-400 font-semibold">Dica:</span> A cada 10 cortes, você ganha 1 grátis! Continue vindo!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
