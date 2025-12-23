import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { GlassCard } from '../components/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, MapPin, Clock, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { sendWhatsApp } from '../lib/wordnet';

interface AppointmentWithDetails {
  id: string;
  data: string;
  horario: string;
  status: string;
  preco_total: number;
  barbeiro: {
    nome: string;
    nome_barbearia?: string; // Assuming we join this
    avatar_url?: string;
  };
  servicos: {
    servicos: {
      nome: string;
    }
  }[];
}

export default function MyAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const [hasMore, setHasMore] = useState(true);

  // Separate fetches for Upcoming vs History to support pagination on History
  const fetchAppointments = async (isLoadMore = false) => {
    if (!user) {
        setLoading(false);
        return;
    }
    try {
      // 1. Fetch Upcoming (Always fresh)
      if (!isLoadMore) {
        const today = new Date().toISOString();
        const { data: upcomingData } = await supabase
            .from('agendamentos')
            .select(`
            id,
            data,
            horario,
            status,
            preco_total,
            barbeiro:barbeiros(nome, nome_barbearia, foto_url, whatsapp_config, establishment:establishments(slug)),
            servicos:agendamentos_servicos(servicos(nome))
            `)
            .eq('usuario_id', user.id)
            .gte('data', today.split('T')[0]) // Simple date check
            .in('status', ['pendente', 'confirmado', 'pending_payment'])
            .order('data', { ascending: true })
            .order('horario', { ascending: true });
            
        // Filter strictly in JS to be safe with time
        // ... (existing logic can be simplified if backend filter is good)
        // @ts-ignore
        if (upcomingData) setAppointments(upcomingData);
      }

      // 2. Fetch History (Paginated)
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: historyData, error, count } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data,
          horario,
          status,
          preco_total,
          barbeiro:barbeiros(nome, nome_barbearia, foto_url, whatsapp_config, establishment:establishments(slug)),
          servicos:agendamentos_servicos(servicos(nome))
        `, { count: 'exact' })
        .eq('usuario_id', user.id)
        .in('status', ['concluido', 'cancelado', 'no_show']) // Only past statuses
        .order('data', { ascending: false })
        .order('horario', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newHistory = historyData as any || [];
      
      if (isLoadMore) {
          setAppointments(prev => [...prev, ...newHistory]);
      } else {
          // Merge if first load (if logic requires, but here we overwrite/append properly usually)
          // For simplicity in this fix, we just set appointments if not load more, but we already set upcoming above.
          // We need to merge them.
          if (!isLoadMore) {
              // @ts-ignore
              setAppointments(prev => {
                  // Avoid duplicates if any overlap (unlikely due to status filter)
                  const combined = [...(prev || []), ...newHistory];
                  // Dedup by ID just in case
                  return Array.from(new Map(combined.map(item => [item.id, item])).values());
              });
          }
      }
      
      if (newHistory.length < PAGE_SIZE) {
          setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      // Show detailed error to help debugging
      toast.error(`Erro: ${error.message || 'Falha ao carregar'}`);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleCancel = async (id: string, barberConfig: any) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
        const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .eq('id', id);

        if (error) throw error;

        // WhatsApp Notification
        if (barberConfig?.is_active && user?.user_metadata?.telefone) {
            const msg = `Agendamento cancelado com sucesso. Esperamos vê-lo em breve!`;
            sendWhatsApp({
                to: user.user_metadata.telefone,
                message: msg,
                instanceId: barberConfig.instance_id,
                token: barberConfig.api_token
            });
        }

        toast.success('Agendamento cancelado com sucesso.');
        // Optimistic Update
        setAppointments(prev => prev.map(appt => 
            appt.id === id ? { ...appt, status: 'cancelado' } : appt
        ));
    } catch (error) {
        console.error('Error canceling:', error);
        toast.error('Erro ao cancelar.');
    }
  };

  // Filter Logic
  const upcoming = appointments.filter(a => {
    const dateTime = parseISO(`${a.data}T${a.horario}`);
    return !isPast(dateTime) && a.status !== 'cancelado' && a.status !== 'concluido';
  });

  const history = appointments.filter(a => {
    const dateTime = parseISO(`${a.data}T${a.horario}`);
    return isPast(dateTime) || a.status === 'cancelado' || a.status === 'concluido';
  });

  const displayList = activeTab === 'upcoming' ? upcoming : history;

  if (loading) return <div className="min-h-screen bg-[#121212] flex items-center justify-center"><div className="animate-spin h-10 w-10 border-2 border-[#7C3AED] rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Minhas Reservas</h1>
        </div>
        
        <div className="flex p-1 bg-white/5 rounded-xl">
            <button 
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400'}`}
            >
                Agendados ({upcoming.length})
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400'}`}
            >
                Histórico
            </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {displayList.length === 0 ? (
            <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <CalendarClock className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400">Nenhum agendamento encontrado.</p>
                {activeTab === 'upcoming' && (
                    <button 
                        onClick={() => {
                            // Try to find slug from any appointment in history
                            // @ts-ignore
                            const slug = appointments.find(a => a.barbeiro?.establishment?.slug)?.barbeiro?.establishment?.slug;
                            
                            if (slug) {
                                navigate(`/${slug}`);
                            } else {
                                // Fallback: If we can't find a slug, maybe go to a generic search or landing
                                // ideally we shouldn't show this button if we don't know the shop
                                toast.error('Você ainda não tem histórico em nenhuma barbearia.');
                            }
                        }}
                        className="mt-4 px-6 py-2 bg-[#2DD4BF] text-black font-bold rounded-full hover:opacity-90 transition-opacity"
                    >
                        Agendar Novo
                    </button>
                )}
            </div>
        ) : (
            <AnimatePresence mode="popLayout">
                {displayList.map((appt) => (
                    <motion.div
                        key={appt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                    >
                        <GlassCard className="p-0 overflow-hidden group">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{appt.servicos?.[0]?.servicos?.nome || 'Serviço'}</h3>
                                        <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>{appt.barbeiro?.nome_barbearia || 'Barbearia'} • {appt.barbeiro?.nome}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#2DD4BF] font-bold">R$ {appt.preco_total.toFixed(2)}</p>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                            appt.status === 'confirmado' ? 'bg-[#10B981]/20 text-[#10B981]' :
                                            appt.status === 'pendente' ? 'bg-orange-500/20 text-orange-400' :
                                            appt.status === 'cancelado' ? 'bg-red-500/20 text-red-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                            {appt.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-center px-3 border-r border-white/10">
                                        <p className="text-xs text-gray-400 uppercase">Dia</p>
                                        <p className="text-lg font-bold text-white">{format(parseISO(appt.data), 'dd')}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white font-medium capitalize">
                                            {format(parseISO(appt.data), 'MMMM', { locale: ptBR })}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>{appt.horario.slice(0, 5)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            {activeTab === 'upcoming' && appt.status !== 'cancelado' && (
                                <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex justify-end">
                                    <button 
                                        onClick={() => handleCancel(appt.id, (appt.barbeiro as any).whatsapp_config)}
                                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" /> Cancelar Reserva
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    </motion.div>
                ))}
            </AnimatePresence>
        )}
      </div>
    </div>
  );
}
