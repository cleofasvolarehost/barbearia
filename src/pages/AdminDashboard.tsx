import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types/database';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { Filter, Ban, Trash2 } from 'lucide-react';
import { BlockTimeModal } from '../components/BlockTimeModal';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayAppointments: 0,
    pendingAppointments: 0
  });
  
  // Permissions State
  const [canManage, setCanManage] = useState(false);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  
  // Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  useEffect(() => {
      checkPermissions();
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBarber]); // Refetch when filter changes

  const checkPermissions = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('usuarios')
        .select('tipo, is_manager')
        .eq('id', user.id)
        .single();
      
      const isOwner = data?.tipo === 'owner';
      const isManager = data?.tipo === 'barber' && data?.is_manager;
      
      setCanManage(isOwner || isManager || false);

      if (isOwner || isManager) {
          fetchBarbers();
      }
  };

  const fetchBarbers = async () => {
      // Fetch barbers for filter dropdown
      // We need establishment_id. 
      // If owner: establishments where owner_id = user.id
      // If manager: get establishment from linked barber profile
      
      // Simplified: Just fetch all barbers the user has access to see via RLS
      // RLS on 'barbeiros' usually allows reading all in same shop
      
      const { data } = await supabase.from('barbeiros').select('id, nome');
      setBarbers(data || []);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      // 1. Fetch today's appointments
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          barbeiro:barbeiros(nome),
          usuario:usuarios(nome, telefone)
        `)
        .eq('data', today)
        .order('horario', { ascending: true });

      // Apply Filter if selected
      if (selectedBarber !== 'all') {
          query = query.eq('barbeiro_id', selectedBarber);
      }

      const { data: todayData, error: todayError } = await query;

      if (todayError) throw todayError;

      // 1.5 Fetch Overrides for today
      let overrideQuery = supabase
        .from('schedule_overrides')
        .select('*, barbeiro:barbeiros(nome)')
        .gte('start_time', `${today}T00:00:00`)
        .lte('end_time', `${today}T23:59:59`);
        
      if (selectedBarber !== 'all') {
          overrideQuery = overrideQuery.eq('barber_id', selectedBarber);
      }
      
      const { data: overrideData } = await overrideQuery;
      setOverrides(overrideData || []);

      // 2. Fetch all pending appointments (optional, for stats)
      const { count: pendingCount, error: pendingError } = await supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente');

      if (pendingError) throw pendingError;

      const appts = todayData as any[] || [];
      setAppointments(appts);

      // Calculate Stats
      const revenue = appts.reduce((acc, curr) => {
        return curr.status !== 'cancelado' ? acc + (curr.preco_total || 0) : acc;
      }, 0);

      setStats({
        todayRevenue: revenue,
        todayAppointments: appts.length,
        pendingAppointments: pendingCount || 0
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic UI Update
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, status: newStatus as any } : a
    ));

    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Status atualizado para ${newStatus}`);
      fetchDashboardData(); // Refresh to ensure data consistency
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status.');
      fetchDashboardData(); // Revert on error
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!window.confirm('Deseja remover este bloqueio?')) return;
    
    try {
      const { error } = await supabase
        .from('schedule_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bloqueio removido!');
      fetchDashboardData();
    } catch (error) {
      toast.error('Erro ao remover bloqueio');
    }
  };

  if (loading && !appointments.length) {
    return <div className="p-8 text-center text-white bg-dark min-h-screen">Carregando painel...</div>;
  }

  return (
    <div className="bg-dark min-h-screen py-10 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white mb-8 uppercase border-l-4 border-gold pl-4">
          Painel Administrativo
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="overflow-hidden rounded-none bg-dark-secondary px-4 py-5 shadow border border-gray-800 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-400 uppercase tracking-wide">Faturamento Hoje</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-gold">
              R$ {stats.todayRevenue.toFixed(2)}
            </dd>
          </div>
          <div className="overflow-hidden rounded-none bg-dark-secondary px-4 py-5 shadow border border-gray-800 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-400 uppercase tracking-wide">Agendamentos Hoje</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-white">
              {stats.todayAppointments}
            </dd>
          </div>
          <div className="overflow-hidden rounded-none bg-dark-secondary px-4 py-5 shadow border border-gray-800 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-400 uppercase tracking-wide">Pendentes (Total)</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-white">
              {stats.pendingAppointments}
            </dd>
          </div>
        </div>

        {/* Live Schedule */}
        <div className="bg-dark-secondary shadow sm:rounded-none border border-gray-800">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-800 flex-wrap gap-4">
            <h2 className="text-base font-bold leading-6 text-white uppercase tracking-wide">Agenda de Hoje</h2>
            
            <div className="flex items-center gap-4">
                {/* Filter Dropdown (Only for Managers/Owners) */}
                {canManage && (
                    <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsBlockModalOpen(true)}
                          className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wide transition-colors"
                        >
                            <Ban className="w-3 h-3" />
                            Bloquear Horário
                        </button>
                        <div className="relative">
                            <select
                                value={selectedBarber}
                                onChange={(e) => setSelectedBarber(e.target.value)}
                                className="bg-black/20 text-white text-sm border border-gray-700 rounded-none px-3 py-1.5 focus:border-gold outline-none appearance-none pr-8 cursor-pointer uppercase tracking-wider font-bold"
                            >
                                <option value="all">Todos os Barbeiros</option>
                                {barbers.map(b => (
                                    <option key={b.id} value={b.id}>{b.nome}</option>
                                ))}
                            </select>
                            <Filter className="w-3 h-3 text-gold absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                )}

                <button 
                  onClick={fetchDashboardData}
                  className="text-sm text-gold hover:text-white font-medium transition-colors uppercase tracking-wider"
                >
                  Atualizar
                </button>
            </div>
          </div>
          <div className="">
            {/* Overrides List */}
            {overrides.length > 0 && (
              <div className="border-b border-gray-800 bg-red-900/10">
                <ul className="divide-y divide-gray-800">
                  {overrides.map((override) => (
                    <li key={override.id} className="flex items-center justify-between gap-x-6 py-4 px-6 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000000_10px,#000000_20px)] opacity-10 pointer-events-none"></div>
                      <div className="min-w-0 relative z-10">
                        <div className="flex items-start gap-x-3">
                          <p className="text-sm font-bold leading-6 text-red-400">
                            {override.type === 'full_day' 
                              ? 'DIA INTEIRO' 
                              : `${format(new Date(override.start_time), 'HH:mm')} - ${format(new Date(override.end_time), 'HH:mm')}`}
                          </p>
                          <span className="inline-flex items-center rounded-none bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20 uppercase">
                            BLOQUEADO
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-400">
                          <p className="truncate">Barbeiro: <span className="text-gray-300">{override.barbeiro?.nome}</span></p>
                          <span className="text-gray-600">•</span>
                          <p className="truncate">Motivo: <span className="text-white">{override.reason}</span></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteOverride(override.id)}
                        className="text-gray-500 hover:text-red-500 transition-colors z-10"
                        title="Remover Bloqueio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {appointments.length === 0 && overrides.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Nenhum agendamento para hoje.</div>
            ) : (
              <ul role="list" className="divide-y divide-gray-800">
                {appointments.map((appt: any) => (
                  <li key={appt.id} className="flex items-center justify-between gap-x-6 py-5 px-6 hover:bg-gray-800/50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm font-bold leading-6 text-white">
                          {appt.horario.slice(0, 5)} <span className="text-gold mx-2">|</span> {appt.usuario?.nome || 'Cliente'}
                        </p>
                        <p className={`rounded-none whitespace-nowrap mt-0.5 px-2 py-0.5 text-xs font-bold uppercase tracking-wide border
                          ${appt.status === 'confirmado' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 
                            appt.status === 'pendente' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                            appt.status === 'cancelado' ? 'text-red-400 border-red-400/30 bg-red-400/10' : 
                            'text-gray-400 border-gray-600 bg-gray-800'}`}>
                          {appt.status}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-400">
                        <p className="truncate">Barbeiro: <span className="text-gray-300">{appt.barbeiro?.nome}</span></p>
                        <span className="text-gray-600">•</span>
                        <p className="truncate">Tel: <span className="text-gray-300">{appt.usuario?.telefone || 'N/A'}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-x-4">
                      {appt.status === 'pendente' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'confirmado')}
                          className="rounded-none bg-transparent border border-gray-600 px-3 py-1.5 text-xs font-bold text-gray-300 hover:border-green-500 hover:text-green-500 transition-all uppercase tracking-wide"
                        >
                          Confirmar
                        </button>
                      )}
                      {appt.status === 'confirmado' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'concluido')}
                          className="rounded-none bg-gold px-3 py-1.5 text-xs font-bold text-dark hover:bg-white transition-colors uppercase tracking-wide"
                        >
                          Concluir
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <BlockTimeModal 
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={fetchDashboardData}
        barbers={barbers}
        currentUser={user}
      />
    </div>
  );
}
