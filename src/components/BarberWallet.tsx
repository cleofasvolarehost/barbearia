import { motion } from 'motion/react';
import { TrendingUp, ArrowUpRight, Calendar, DollarSign, Users, Clock, Sparkles } from 'lucide-react';

export function BarberWallet() {
  const walletData = {
    balanceAvailable: 1247.50,
    nextPayout: 'Amanhã',
    todayEarnings: 385.00,
    weeklyEarnings: [120, 180, 240, 320, 280, 350, 385],
    weekDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    todayCommissions: [
      { id: 1, client: 'João Pedro', service: 'Corte + Barba', time: '14:30', amount: 45.00 },
      { id: 2, client: 'Carlos Mendes', service: 'Corte Premium', time: '15:15', amount: 65.00 },
      { id: 3, client: 'Rafael Costa', service: 'Barba', time: '16:00', amount: 30.00 },
      { id: 4, client: 'Lucas Silva', service: 'Corte + Platinado', time: '16:45', amount: 85.00 },
      { id: 5, client: 'Fernando Alves', service: 'Corte Social', time: '17:30', amount: 40.00 },
      { id: 6, client: 'Marcelo Santos', service: 'Corte + Barba', time: '18:15', amount: 45.00 },
      { id: 7, client: 'Bruno Lima', service: 'Degradê', time: '19:00', amount: 50.00 },
      { id: 8, client: 'André Oliveira', service: 'Barba Premium', time: '19:45', amount: 25.00 },
    ],
  };

  const maxEarning = Math.max(...walletData.weeklyEarnings);
  const growthPercentage = 23.5;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold">Minha Carteira</h1>
          </div>
          <p className="text-white/60">Gestão financeira profissional</p>
        </div>

        {/* Balance Card - Stock Market Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-8 rounded-3xl bg-gradient-to-br from-[#7C3AED]/20 via-[#050505] to-[#2DD4BF]/10 border-2 border-[#7C3AED]/30 shadow-2xl shadow-[#7C3AED]/20 backdrop-blur-xl relative overflow-hidden"
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Saldo Disponível</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
                    R$ {walletData.balanceAvailable.toFixed(2)}
                  </h2>
                  <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/30">
                    <TrendingUp className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm font-bold text-[#10B981]">+{growthPercentage}%</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
                  <p className="text-xs text-white/60 mb-1">Próximo Saque</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-sm font-bold text-white">{walletData.nextPayout}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-[#10B981]" />
                  <span className="text-sm text-white/60">Hoje</span>
                </div>
                <p className="text-2xl font-bold text-white">R$ {walletData.todayEarnings.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-[#7C3AED]" />
                  <span className="text-sm text-white/60">Clientes Hoje</span>
                </div>
                <p className="text-2xl font-bold text-white">{walletData.todayCommissions.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sparkline Chart - Crypto Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Ganhos da Semana</h3>
              <p className="text-sm text-white/60">Performance últimos 7 dias</p>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30">
              <ArrowUpRight className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm font-semibold text-[#10B981]">Crescendo</span>
            </div>
          </div>

          {/* Sparkline Chart */}
          <div className="relative h-40">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 160">
              {/* Grid Lines */}
              <g opacity="0.1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 40}
                    x2="700"
                    y2={i * 40}
                    stroke="white"
                    strokeWidth="1"
                  />
                ))}
              </g>

              {/* Area Gradient */}
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="50%" stopColor="#2DD4BF" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              {/* Area Fill */}
              <path
                d={`M 0 ${160 - (walletData.weeklyEarnings[0] / maxEarning) * 140} ${walletData.weeklyEarnings
                  .map((val, i) => `L ${(i * 100)} ${160 - (val / maxEarning) * 140}`)
                  .join(' ')} L 600 160 L 0 160 Z`}
                fill="url(#areaGradient)"
              />

              {/* Line */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                d={`M 0 ${160 - (walletData.weeklyEarnings[0] / maxEarning) * 140} ${walletData.weeklyEarnings
                  .map((val, i) => `L ${(i * 100)} ${160 - (val / maxEarning) * 140}`)
                  .join(' ')}`}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots */}
              {walletData.weeklyEarnings.map((val, i) => (
                <motion.circle
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300 }}
                  cx={i * 100}
                  cy={160 - (val / maxEarning) * 140}
                  r="5"
                  fill="#10B981"
                  className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                />
              ))}
            </svg>
          </div>

          {/* Days Labels */}
          <div className="flex justify-between mt-4">
            {walletData.weekDays.map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-white/60 mb-1">{day}</p>
                <p className="text-sm font-semibold text-white/80">R$ {walletData.weeklyEarnings[i]}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's Commissions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold mb-1">Comissões de Hoje</h3>
              <p className="text-sm text-white/60">{walletData.todayCommissions.length} atendimentos</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30">
              <p className="text-2xl font-bold text-[#10B981]">R$ {walletData.todayEarnings.toFixed(2)}</p>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {walletData.todayCommissions.map((commission, index) => (
              <motion.div
                key={commission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center font-bold text-sm">
                        {commission.client.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{commission.client}</h4>
                        <p className="text-xs text-white/60">{commission.service}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-xs text-white/60 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{commission.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ArrowUpRight className="w-4 h-4 text-[#10B981]" />
                        <span className="text-xl font-bold text-[#10B981]">
                          +R$ {commission.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.8);
        }
      `}</style>
    </div>
  );
}
