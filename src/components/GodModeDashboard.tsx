import { useRef, useEffect, useState, useCallback } from 'react';
import { GlassCard } from './GlassCard';
import { Users, TrendingUp, Clock, DollarSign, RefreshCw, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, getHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useEstablishment } from '../contexts/EstablishmentContext';

// Interfaces
interface DashboardStats {
  todayRevenue: number;
  todayAppointments: number;
  totalClients: number;
  avgTicket: number;
  busyCount: number;
  freeCount: number;
  occupancyRate: number;
}

interface ProfessionalStatus {
  id: string;
  name: string;
  status: 'busy' | 'free';
  color: string;
}

// --- MOCK DATA FOR ANALYTICS (To be replaced by real queries later) ---
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
  { id: 1, name: 'Ricardo Santos', revenue: 8750, avatar: 'https://i.pravatar.cc/150?img=12', rank: 1 },
  { id: 2, name: 'Carlos Mendes', revenue: 7320, avatar: 'https://i.pravatar.cc/150?img=33', rank: 2 },
  { id: 3, name: 'Felipe Costa', revenue: 6890, avatar: 'https://i.pravatar.cc/150?img=52', rank: 3 },
  { id: 4, name: 'Bruno Silva', revenue: 5240, avatar: 'https://i.pravatar.cc/150?img=68', rank: 4 },
  { id: 5, name: 'André Oliveira', revenue: 4680, avatar: 'https://i.pravatar.cc/150?img=15', rank: 5 },
];

const retentionData = { newClients: 35, returningClients: 65 };
// ---------------------------------------------------------------------

export function GodModeDashboard() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayAppointments: 0,
    totalClients: 0,
    avgTicket: 0,
    busyCount: 0,
    freeCount: 0,
    occupancyRate: 0
  });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalStatus[]>([]);

  // Analytics State
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const maxRevenue = Math.max(...staffLeaderboardData.map(s => s.revenue));

  // --- Helpers for Analytics Visuals ---
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
  // -------------------------------------

  const fetchData = useCallback(async () => {
    if (!establishment) return;

    try {
      setLoading(true);
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Calculate Week Range for Heatmap
      const startWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
      const endWeek = endOfWeek(today, { weekStartsOn: 0 });
      const startWeekStr = format(startWeek, 'yyyy-MM-dd');
      const endWeekStr = format(endWeek, 'yyyy-MM-dd');

      // 1. Fetch Today's Appointments
      const { data: todayAppts, error: apptsError } = await supabase
        .from('agendamentos')
        .select(`
          id,
          horario,
          status,
          preco_total,
          usuario:usuarios(nome),
          barbeiro:barbeiros(nome, id),
          servicos:agendamentos_servicos(servicos(nome))
        `)
        .eq('establishment_id', establishment.id)
        .eq('data', todayStr)
        .order('horario');

      if (apptsError) throw apptsError;

      // 2. Fetch Week Appointments for Heatmap
      const { data: weekAppts, error: weekError } = await supabase
        .from('agendamentos')
        .select('data, horario, status')
        .eq('establishment_id', establishment.id)
        .gte('data', startWeekStr)
        .lte('data', endWeekStr)
        .neq('status', 'cancelado');
        
      if (weekError) throw weekError;

      // 3. Fetch Barbers
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbeiros')
        .select('id, nome, ativo')
        .eq('establishment_id', establishment.id);

      if (barbersError) throw barbersError;

      // --- PROCESS DATA ---

      // KPI Stats
      const appts = todayAppts || [];
      const revenue = appts.reduce((acc, curr) => curr.status !== 'cancelado' ? acc + (curr.preco_total || 0) : acc, 0);
      const avgTicket = appts.length > 0 ? revenue / appts.length : 0;

      // Professional Status
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeValue = currentHour * 60 + currentMinute;

      const proStatus: ProfessionalStatus[] = (barbersData || []).map((b, idx) => {
        const isBusy = appts.some(a => {
            if (!a.horario) return false;
            const [h, m] = a.horario.split(':').map(Number);
            const start = h * 60 + m;
            const end = start + 45; // Approx
            
            const barberId = typeof a.barbeiro === 'object' && a.barbeiro ? (a.barbeiro as any).id : null;
            return currentTimeValue >= start && currentTimeValue < end && barberId === b.id && a.status !== 'cancelado';
        });
        const colors = ['#7C3AED', '#2DD4BF', '#3B82F6', '#F97316', '#EC4899'];
        return {
            id: b.id,
            name: b.nome,
            status: isBusy ? 'busy' : 'free',
            color: colors[idx % colors.length]
        };
      });

      // Heatmap Calculation
      const days = eachDayOfInterval({ start: startWeek, end: endWeek });
      const hours = ['09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
      const totalBarbers = barbersData?.length || 1;

      const heatmap = days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayName = format(day, 'EEE', { locale: ptBR }).replace('.', '');
          const dayAppts = weekAppts?.filter(a => a.data === dayStr) || [];

          const slots = hours.map(hour => {
              const hourInt = parseInt(hour);
              // Count appointments in this hour
              const count = dayAppts.filter(a => {
                  const h = parseInt(a.horario.split(':')[0]);
                  return h === hourInt;
              }).length;

              // Max capacity per hour = barbers * 2 (assuming 2 slots/hour)
              const capacity = totalBarbers * 2;
              let occupancy = capacity > 0 ? Math.round((count / capacity) * 100) : 0;
              if (occupancy > 100) occupancy = 100;

              return {
                  hour: `${hour}h`,
                  occupancy
              };
          });

          return {
              day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
              slots
          };
      });

      setHeatmapData(heatmap);
      setProfessionals(proStatus);
      setAppointments(appts);
      setStats({
        todayRevenue: revenue,
        todayAppointments: appts.length,
        totalClients: 0,
        avgTicket: avgTicket,
        busyCount: proStatus.filter(p => p.status === 'busy').length,
        freeCount: proStatus.filter(p => p.status === 'free').length,
        occupancyRate: 0 
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao atualizar dados.');
    } finally {
      setLoading(false);
    }
  }, [establishment]);

  useEffect(() => {
    if (establishment) {
        fetchData();
        const interval = setInterval(fetchData, 60000); 
        return () => clearInterval(interval);
    } else if (!establishmentLoading) {
        setLoading(false);
    }
  }, [establishment, establishmentLoading, fetchData]);

  if (establishmentLoading || (loading && establishment)) return <div className="p-8 text-white">Carregando dados...</div>;

  if (!establishment) return (
      <div className="p-8 text-white flex flex-col items-center justify-center h-full">
          <p className="mb-4">Nenhuma barbearia configurada.</p>
          <a href="/admin/setup" className="px-4 py-2 bg-[#7C3AED] rounded-lg text-white font-bold">
              Configurar Agora
          </a>
      </div>
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">God Mode</h2>
            <p className="text-gray-400">Visão total da operação - {establishment.name}</p>
        </div>
        <button 
            onClick={fetchData} 
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Atualizar"
        >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 1. REAL-TIME KPI HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="p-8 relative overflow-hidden lg:col-span-2">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED] rounded-full blur-[120px] opacity-20"></div>
            <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-white/60">
                <DollarSign className="w-5 h-5" />
                <span className="uppercase tracking-wider font-bold">Faturamento Hoje</span>
            </div>
            <div className="flex items-baseline gap-4">
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                >
                <h1 className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                    R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h1>
                </motion.div>
            </div>
            <p className="text-white/50 mt-2">Ticket Médio: <span className="text-[#2DD4BF]">R$ {stats.avgTicket.toFixed(2)}</span></p>
            </div>
          </GlassCard>

          <GlassCard className="p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Status da Equipe</h3>
                <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {professionals.slice(0, 4).map((pro) => (
                    <div key={pro.id} className={`p-3 rounded-xl border ${pro.status === 'busy' ? 'bg-red-500/10 border-red-500/30' : 'bg-[#10B981]/10 border-[#10B981]/30'}`}>
                        <p className="font-bold text-white text-sm truncate">{pro.name}</p>
                        <p className={`text-xs ${pro.status === 'busy' ? 'text-red-400' : 'text-[#10B981]'}`}>
                            {pro.status === 'busy' ? 'Ocupado' : 'Livre'}
                        </p>
                    </div>
                ))}
            </div>
          </GlassCard>
      </div>

      {/* 2. ANALYTICS GRID (From Pasta 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heatmap */}
          <GlassCard className="p-6 lg:col-span-2 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Mapa de Ocupação</h2>
                    <p className="text-sm text-gray-400">Horários de pico em tempo real (Taxa: {stats.occupancyRate}%)</p>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="inline-block min-w-full">
                    {/* Header Hours */}
                    <div className="flex gap-1 mb-2 ml-12">
                        {heatmapData[0].slots.map((slot, i) => (
                            <div key={i} className="w-12 text-center text-xs text-gray-500 font-mono">{slot.hour}</div>
                        ))}
                    </div>
                    {/* Grid */}
                    {heatmapData.map((dayData, dayIndex) => (
                        <div key={dayData.day} className="flex gap-1 mb-1 items-center">
                            <div className="w-10 text-xs text-gray-400 text-right pr-2 font-bold">{dayData.day}</div>
                            {dayData.slots.map((slot) => (
                                <motion.div
                                    key={`${dayData.day}-${slot.hour}`}
                                    whileHover={{ scale: 1.1, zIndex: 10 }}
                                    className={`w-12 h-12 rounded-lg cursor-pointer transition-all ${getHeatColor(slot.occupancy)} ${getGlowIntensity(slot.occupancy)} relative group`}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-bold text-white">{slot.occupancy}%</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
          </GlassCard>

          {/* Staff Leaderboard */}
          <GlassCard className="p-6">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Ranking da Equipe</h2>
                    <p className="text-sm text-gray-400">Top performers da semana</p>
                </div>
             </div>

             <div className="space-y-5">
                {staffLeaderboardData.map((staff, index) => (
                    <div key={staff.id} className="relative">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-3 w-32">
                                <span className={`font-bold ${getMedalColor(staff.rank)} w-5 text-center`}>#{staff.rank}</span>
                                <img src={staff.avatar} alt={staff.name} className="w-8 h-8 rounded-full ring-2 ring-white/10" />
                                <span className="text-sm font-semibold text-white truncate">{staff.name.split(' ')[0]}</span>
                            </div>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(staff.revenue / maxRevenue) * 100}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className={`h-full rounded-full ${staff.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]'}`}
                                />
                            </div>
                            <span className="text-xs font-mono text-gray-400 w-16 text-right">R${(staff.revenue/1000).toFixed(1)}k</span>
                        </div>
                    </div>
                ))}
             </div>
          </GlassCard>

          {/* Retention Chart (Donut) */}
          <GlassCard className="p-6 flex flex-col items-center justify-center">
             <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Retenção de Clientes</h2>
                <p className="text-sm text-gray-400">Novos vs Recorrentes</p>
             </div>
             
             <div className="relative w-48 h-48">
                 <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                     <circle cx="50" cy="50" r="40" fill="none" stroke="#333" strokeWidth="10" />
                     <motion.circle 
                        cx="50" cy="50" r="40" fill="none" stroke="#7C3AED" strokeWidth="10"
                        strokeDasharray={`${(retentionData.returningClients / 100) * 251} 251`}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${(retentionData.returningClients / 100) * 251} 251` }}
                        transition={{ duration: 1.5 }}
                        className="drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                     />
                     <motion.circle 
                        cx="50" cy="50" r="40" fill="none" stroke="#2DD4BF" strokeWidth="10"
                        strokeDasharray={`${(retentionData.newClients / 100) * 251} 251`}
                        strokeDashoffset={-((retentionData.returningClients / 100) * 251)}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${(retentionData.newClients / 100) * 251} 251` }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                     />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-3xl font-black text-white">{retentionData.returningClients}%</span>
                     <span className="text-[10px] text-gray-400 uppercase tracking-widest">Retorno</span>
                 </div>
             </div>

             <div className="flex gap-6 mt-6">
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-[#7C3AED]"></div>
                     <span className="text-sm text-gray-400">Recorrentes</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-[#2DD4BF]"></div>
                     <span className="text-sm text-gray-400">Novos</span>
                 </div>
             </div>
          </GlassCard>
      </div>

      {/* 3. AGENDA TIMELINE (Today's Cuts) */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2DD4BF]" /> Agenda de Hoje
        </h3>
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar"
        >
          {appointments.length === 0 ? (
             <div className="w-full text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-xl">
                <p>Nenhum agendamento para hoje ainda.</p>
             </div>
          ) : (
            appointments.map((apt, idx) => (
                <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex-shrink-0 w-72 group"
                >
                <div className={`p-4 rounded-2xl border transition-all hover:scale-105 cursor-pointer ${
                    apt.status === 'confirmado' 
                    ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 hover:border-[#7C3AED]' 
                    : apt.status === 'concluido'
                    ? 'bg-green-500/10 border-green-500/20 opacity-70'
                    : 'bg-white/5 border-white/20'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                    <span className="text-[#2DD4BF] font-mono font-bold text-xl">{apt.horario.slice(0, 5)}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        apt.status === 'confirmado'
                        ? 'bg-[#7C3AED]/20 text-[#7C3AED]'
                        : apt.status === 'concluido'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 text-white/60'
                    }`}>
                        {apt.status}
                    </span>
                    </div>
                    <h4 className="text-white mb-1 font-bold truncate text-lg">{apt.usuario?.nome || 'Cliente'}</h4>
                    <p className="text-white/60 text-sm mb-4 truncate">{apt.servicos?.[0]?.servicos?.nome || 'Serviço'}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center text-[10px] text-white font-bold">
                                {apt.barbeiro?.nome?.charAt(0)}
                            </div>
                            <p className="text-white/40 text-xs">{apt.barbeiro?.nome}</p>
                        </div>
                        <p className="text-[#2DD4BF] font-bold text-sm">R$ {apt.preco_total}</p>
                    </div>
                </div>
                </motion.div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Custom CSS for Scrollbars */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #7C3AED; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6D28D9; }
      `}</style>
    </div>
  );
}
