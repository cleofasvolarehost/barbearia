import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, TrendingUp, Users } from 'lucide-react';

// Mock data para os widgets
const generateHeatmapData = () => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = ['9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h'];
  
  return days.map(day => ({
    day,
    slots: hours.map(hour => ({
      hour,
      occupancy: Math.floor(Math.random() * 100), // 0-100% de ocupação
    }))
  }));
};

const staffLeaderboardData = [
  {
    id: 1,
    name: 'Ricardo Santos',
    revenue: 8750,
    avatar: 'https://i.pravatar.cc/150?img=12',
    rank: 1,
  },
  {
    id: 2,
    name: 'Carlos Mendes',
    revenue: 7320,
    avatar: 'https://i.pravatar.cc/150?img=33',
    rank: 2,
  },
  {
    id: 3,
    name: 'Felipe Costa',
    revenue: 6890,
    avatar: 'https://i.pravatar.cc/150?img=52',
    rank: 3,
  },
  {
    id: 4,
    name: 'Bruno Silva',
    revenue: 5240,
    avatar: 'https://i.pravatar.cc/150?img=68',
    rank: 4,
  },
  {
    id: 5,
    name: 'André Oliveira',
    revenue: 4680,
    avatar: 'https://i.pravatar.cc/150?img=15',
    rank: 5,
  },
];

const retentionData = {
  newClients: 35,
  returningClients: 65,
};

export function GodModeAnalytics() {
  const [heatmapData] = useState(generateHeatmapData());
  const maxRevenue = Math.max(...staffLeaderboardData.map(s => s.revenue));

  // Calcula a intensidade da cor baseado na ocupação (0-100)
  const getHeatColor = (occupancy: number) => {
    if (occupancy === 0) return 'bg-[#0a0a0a]';
    if (occupancy < 25) return 'bg-purple-950/30';
    if (occupancy < 50) return 'bg-purple-900/50';
    if (occupancy < 75) return 'bg-purple-700/70';
    return 'bg-[#7C3AED]';
  };

  const getGlowIntensity = (occupancy: number) => {
    if (occupancy < 25) return '';
    if (occupancy < 50) return 'shadow-[0_0_8px_rgba(124,58,237,0.3)]';
    if (occupancy < 75) return 'shadow-[0_0_12px_rgba(124,58,237,0.5)]';
    return 'shadow-[0_0_16px_rgba(124,58,237,0.8)]';
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-transparent';
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
            God Mode Analytics
          </h1>
          <p className="text-gray-400">Dashboard administrativo avançado</p>
        </div>

        {/* Grid de Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Occupancy Heatmap */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-2xl p-6 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Mapa de Ocupação</h2>
                <p className="text-sm text-gray-400">Horários de pico em tempo real</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header com horas */}
                <div className="flex gap-1 mb-2 ml-12">
                  {heatmapData[0].slots.map((slot, i) => (
                    <div key={i} className="w-12 text-center text-xs text-gray-500">
                      {slot.hour}
                    </div>
                  ))}
                </div>

                {/* Grid de ocupação */}
                {heatmapData.map((dayData, dayIndex) => (
                  <motion.div
                    key={dayData.day}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dayIndex * 0.05 }}
                    className="flex gap-1 mb-1 items-center"
                  >
                    <div className="w-10 text-xs text-gray-400 text-right pr-2">
                      {dayData.day}
                    </div>
                    {dayData.slots.map((slot, slotIndex) => (
                      <motion.div
                        key={`${dayData.day}-${slot.hour}`}
                        whileHover={{ scale: 1.2, zIndex: 10 }}
                        className={`
                          w-12 h-12 rounded-lg cursor-pointer transition-all
                          ${getHeatColor(slot.occupancy)}
                          ${getGlowIntensity(slot.occupancy)}
                          relative group
                        `}
                        title={`${dayData.day} ${slot.hour}: ${slot.occupancy}% ocupado`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          <div className="bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-purple-500/30 whitespace-nowrap">
                            <p className="text-xs text-white font-semibold">{dayData.day} {slot.hour}</p>
                            <p className="text-xs text-purple-400">{slot.occupancy}% ocupado</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
              <span className="text-xs text-gray-400">Legenda:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#0a0a0a]"></div>
                <span className="text-xs text-gray-500">Vazio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-950/30"></div>
                <span className="text-xs text-gray-500">Baixo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-900/50"></div>
                <span className="text-xs text-gray-500">Médio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-700/70"></div>
                <span className="text-xs text-gray-500">Alto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#7C3AED] shadow-[0_0_16px_rgba(124,58,237,0.8)]"></div>
                <span className="text-xs text-gray-500">Lotado</span>
              </div>
            </div>
          </motion.div>

          {/* 2. Staff Leaderboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Ranking de Staff</h2>
                <p className="text-sm text-gray-400">Top performers do mês</p>
              </div>
            </div>

            <div className="space-y-4">
              {staffLeaderboardData.map((staff, index) => (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="relative"
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Medalha para top 3 */}
                      {staff.rank <= 3 && (
                        <Crown className={`w-5 h-5 ${getMedalColor(staff.rank)}`} />
                      )}
                      {staff.rank > 3 && (
                        <span className="w-5 text-center text-sm text-gray-600">#{staff.rank}</span>
                      )}
                      
                      {/* Avatar */}
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-10 h-10 rounded-full ring-2 ring-purple-500/30"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{staff.name}</p>
                      <p className="text-xs text-gray-400">
                        R$ {staff.revenue.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden ml-12">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(staff.revenue / maxRevenue) * 100}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        staff.rank === 1
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          : staff.rank === 2
                          ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                          : staff.rank === 3
                          ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                          : 'bg-gradient-to-r from-purple-500 to-teal-500'
                      }`}
                      style={{
                        boxShadow:
                          staff.rank === 1
                            ? '0 0 12px rgba(251, 191, 36, 0.5)'
                            : '0 0 8px rgba(124, 58, 237, 0.3)',
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 3. Retention Donut Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-6 backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Retenção de Clientes</h2>
                <p className="text-sm text-gray-400">Novos vs Recorrentes</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              {/* SVG Donut Chart */}
              <div className="relative">
                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="20"
                  />
                  
                  {/* Returning clients (larger segment) */}
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="url(#gradientReturning)"
                    strokeWidth="20"
                    strokeDasharray={`${(retentionData.returningClients / 100) * 502.65} 502.65`}
                    initial={{ strokeDasharray: '0 502.65' }}
                    animate={{ strokeDasharray: `${(retentionData.returningClients / 100) * 502.65} 502.65` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(124, 58, 237, 0.6))',
                    }}
                  />
                  
                  {/* New clients */}
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="url(#gradientNew)"
                    strokeWidth="20"
                    strokeDasharray={`${(retentionData.newClients / 100) * 502.65} 502.65`}
                    strokeDashoffset={-((retentionData.returningClients / 100) * 502.65)}
                    initial={{ strokeDasharray: '0 502.65' }}
                    animate={{ strokeDasharray: `${(retentionData.newClients / 100) * 502.65} 502.65` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                    style={{
                      filter: 'drop-shadow(0 0 12px rgba(20, 184, 166, 0.6))',
                    }}
                  />

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="gradientReturning" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                    <linearGradient id="gradientNew" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14B8A6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-black text-white">{retentionData.returningClients}%</p>
                    <p className="text-xs text-gray-400">retornam</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-6 mt-8 w-full max-w-xs">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-center"
                >
                  <div className="w-full h-1 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full mb-2 shadow-[0_0_12px_rgba(124,58,237,0.6)]" />
                  <p className="text-2xl font-black text-white">{retentionData.returningClients}%</p>
                  <p className="text-xs text-gray-400">Recorrentes</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-center"
                >
                  <div className="w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full mb-2 shadow-[0_0_12px_rgba(20,184,166,0.6)]" />
                  <p className="text-2xl font-black text-white">{retentionData.newClients}%</p>
                  <p className="text-xs text-gray-400">Novos</p>
                </motion.div>
              </div>

              {/* Insight */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-teal-500/10 border border-purple-500/20"
              >
                <p className="text-xs text-center text-gray-300">
                  <span className="text-purple-400 font-semibold">Excelente!</span> Alta taxa de retenção indica satisfação dos clientes.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
