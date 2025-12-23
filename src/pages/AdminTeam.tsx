import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { GlassCard } from '../components/GlassCard';
import { Plus, Trash2, Calendar, User, Mail, Lock, Check, Clock, Copy, Power } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Switch } from '@headlessui/react';

// Types
interface DaySchedule {
    active: boolean;
    workHours: { start: string; end: string };
    lunchBreak: { start: string; end: string };
}

type WeeklySchedule = Record<number, DaySchedule>;

interface Barber {
  id: string;
  nome: string;
  foto_url?: string;
  ativo: boolean;
  user_id?: string;
  // Legacy fields (kept for fallback)
  work_days?: number[]; 
  work_hours_start?: string; 
  work_hours_end?: string;
  // New flexible config
  schedule_config?: WeeklySchedule | any; 
}

export default function AdminTeam() {
  const { establishment } = useEstablishment();
  const [team, setTeam] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  // Form State - Add Barber
  const [newBarber, setNewBarber] = useState({
      name: '',
      email: '',
      password: ''
  });
  const [adding, setAdding] = useState(false);

  // Form State - Schedule
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [selectedDay, setSelectedDay] = useState<number>(1); // 0-6, default Monday (1)

  const fetchTeam = async () => {
    if (!establishment) return;
    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('created_at');

      if (error) throw error;
      setTeam(data || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (establishment) fetchTeam();
  }, [establishment]);

  const handleAddBarber = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!establishment) return;
      setAdding(true);

      try {
        // 1. Call Edge Function to Create User & Profile
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
                email: newBarber.email,
                password: newBarber.password,
                name: newBarber.name,
                establishment_id: establishment.id,
                tipo: 'barber'
            }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success('Barbeiro cadastrado com sucesso!');
        setIsAddModalOpen(false);
        setNewBarber({ name: '', email: '', password: '' });
        fetchTeam();

      } catch (error: any) {
          console.error('Add barber error:', error);
          toast.error(error.message || 'Erro ao adicionar barbeiro');
      } finally {
          setAdding(false);
      }
  };

  const handleSaveSchedule = async () => {
      if (!selectedBarber) return;
      try {
          // Calculate legacy fields for backward compatibility (optional, but good for simple queries)
          const activeDays = Object.entries(weeklySchedule)
            .filter(([_, day]) => day.active)
            .map(([dayIdx, _]) => parseInt(dayIdx));
          
          // Use the first active day as "default" start/end for legacy columns
          const firstActive = weeklySchedule[activeDays[0]] || weeklySchedule[1];

          const { error } = await supabase
            .from('barbeiros')
            .update({
                work_days: activeDays,
                work_hours_start: firstActive?.workHours.start || '09:00',
                work_hours_end: firstActive?.workHours.end || '19:00',
                schedule_config: weeklySchedule
            })
            .eq('id', selectedBarber.id);

          if (error) throw error;
          toast.success('Horários atualizados!');
          setIsScheduleModalOpen(false);
          fetchTeam();
      } catch (error) {
          toast.error('Erro ao salvar horários.');
          console.error(error);
      }
  };

  const updateDaySchedule = (field: keyof DaySchedule | 'workStart' | 'workEnd' | 'lunchStart' | 'lunchEnd', value: any) => {
      setWeeklySchedule(prev => {
          const currentDay = prev[selectedDay];
          const updatedDay = { ...currentDay };

          if (field === 'active') updatedDay.active = value;
          else if (field === 'workStart') updatedDay.workHours = { ...updatedDay.workHours, start: value };
          else if (field === 'workEnd') updatedDay.workHours = { ...updatedDay.workHours, end: value };
          else if (field === 'lunchStart') updatedDay.lunchBreak = { ...updatedDay.lunchBreak, start: value };
          else if (field === 'lunchEnd') updatedDay.lunchBreak = { ...updatedDay.lunchBreak, end: value };

          return { ...prev, [selectedDay]: updatedDay };
      });
  };

  const copyToAllDays = () => {
      const currentConfig = weeklySchedule[selectedDay];
      const newSchedule: WeeklySchedule = {};
      
      for (let i = 0; i < 7; i++) {
          newSchedule[i] = {
              active: true, // Enable all days when copying? Or keep active state? Usually if I copy I want to apply it.
              workHours: { ...currentConfig.workHours },
              lunchBreak: { ...currentConfig.lunchBreak }
          };
      }
      // Maybe disable Sunday by default if copying? No, let user decide.
      setWeeklySchedule(newSchedule);
      toast.success('Horários copiados para todos os dias!');
  };

  const openScheduleModal = (barber: Barber) => {
      setSelectedBarber(barber);
      setSelectedDay(1); // Default to Monday
      
      // Initialize Full Schedule
      let initialSchedule: WeeklySchedule = {};
      
      // Check if we already have the new structure (check if key '0' exists and has 'workHours')
      const hasNewConfig = barber.schedule_config && '0' in barber.schedule_config && 'workHours' in (barber.schedule_config['0'] || {});

      if (hasNewConfig) {
          initialSchedule = barber.schedule_config;
      } else {
          // Migration from Legacy
          const oldConfig = barber.schedule_config || {
            workHours: { start: barber.work_hours_start || '09:00', end: barber.work_hours_end || '19:00' },
            lunchBreak: { start: '12:00', end: '13:00' }
          };
          // Fallback if oldConfig is just the JSON without lunchBreak/workHours structure (unlikely based on migration, but safe)
          const safeWorkHours = oldConfig.workHours || { start: '09:00', end: '19:00' };
          const safeLunch = oldConfig.lunchBreak || { start: '12:00', end: '13:00' };

          const activeDays = barber.work_days || [1, 2, 3, 4, 5, 6];

          for (let i = 0; i < 7; i++) {
              initialSchedule[i] = {
                  active: activeDays.includes(i),
                  workHours: { ...safeWorkHours },
                  lunchBreak: { ...safeLunch }
              };
          }
      }
      
      setWeeklySchedule(initialSchedule);
      setIsScheduleModalOpen(true);
  };

  const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fullDaysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const currentDayConfig = weeklySchedule[selectedDay] || {
      active: false,
      workHours: { start: '09:00', end: '19:00' },
      lunchBreak: { start: '12:00', end: '13:00' }
  };

  return (
    <div className="p-4 pb-24 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <User className="w-8 h-8 text-[#7C3AED]" /> Equipe
        </h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-colors"
        >
          <Plus className="w-5 h-5" /> Adicionar Barbeiro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((barber) => (
            <GlassCard key={barber.id} className="p-6 relative group">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-[#7C3AED]">
                        {barber.foto_url ? (
                            <img src={barber.foto_url} alt={barber.nome} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-8 h-8 text-gray-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{barber.nome}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${barber.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {barber.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {barber.work_days && barber.work_days.length > 0 
                                ? barber.work_days.map(d => daysMap[d]).join(', ') 
                                : 'Seg - Sáb'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{barber.work_hours_start || '09:00'} - {barber.work_hours_end || '19:00'}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => openScheduleModal(barber)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                        Gerenciar Horários
                    </button>
                    <button className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </GlassCard>
        ))}
      </div>

      {/* Add Barber Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <GlassCard className="max-w-md w-full p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Novo Barbeiro</h2>
                  <form onSubmit={handleAddBarber} className="space-y-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Nome</label>
                          <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <input 
                                  required
                                  value={newBarber.name}
                                  onChange={e => setNewBarber({...newBarber, name: e.target.value})}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                  placeholder="Nome do Profissional"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Email de Acesso</label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <input 
                                  type="email"
                                  required
                                  value={newBarber.email}
                                  onChange={e => setNewBarber({...newBarber, email: e.target.value})}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                  placeholder="email@exemplo.com"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Senha</label>
                          <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <input 
                                  type="text"
                                  required
                                  value={newBarber.password}
                                  onChange={e => setNewBarber({...newBarber, password: e.target.value})}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                  placeholder="Mínimo 6 caracteres"
                                  minLength={6}
                              />
                          </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white">Cancelar</button>
                          <button type="submit" disabled={adding} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold">
                              {adding ? 'Criando...' : 'Criar Conta'}
                          </button>
                      </div>
                  </form>
              </GlassCard>
          </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <GlassCard className="max-w-lg w-full p-6 my-8">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white">Horários de Trabalho</h2>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={copyToAllDays}
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            title="Copiar horários deste dia para todos os outros"
                          >
                              <Copy className="w-3 h-3" /> Replicar para todos
                          </button>
                      </div>
                  </div>
                  
                  {/* Day Selector */}
                  <div className="mb-8">
                      <label className="block text-sm text-gray-400 mb-2">Selecione o Dia para Editar</label>
                      <div className="flex flex-wrap gap-2">
                          {daysMap.map((day, index) => {
                              const isActive = weeklySchedule[index]?.active;
                              const isSelected = selectedDay === index;
                              
                              return (
                                <button
                                    key={index}
                                    onClick={() => setSelectedDay(index)}
                                    className={`w-12 h-10 rounded-lg text-sm font-bold transition-all border-2 relative
                                        ${isSelected 
                                            ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' 
                                            : 'border-transparent bg-white/5 text-gray-400 hover:bg-white/10'}
                                    `}
                                >
                                    {day}
                                    {isActive && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#121212]"></span>
                                    )}
                                </button>
                              );
                          })}
                      </div>
                  </div>

                  {/* Edit Panel for Selected Day */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                          <h3 className="font-bold text-white flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-[#7C3AED]" />
                              {fullDaysMap[selectedDay]}
                          </h3>
                          
                          <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400">
                                  {currentDayConfig.active ? 'Trabalha neste dia' : 'Folga'}
                              </span>
                              <Switch
                                  checked={currentDayConfig.active}
                                  onChange={(val: boolean) => updateDaySchedule('active', val)}
                                  className={`${
                                      currentDayConfig.active ? 'bg-[#7C3AED]' : 'bg-gray-600'
                                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                              >
                                  <span
                                      className={`${
                                          currentDayConfig.active ? 'translate-x-6' : 'translate-x-1'
                                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                  />
                              </Switch>
                          </div>
                      </div>

                      <div className={`space-y-6 transition-opacity ${currentDayConfig.active ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm text-gray-400 mb-1">Início do Expediente</label>
                                  <div className="relative">
                                      <input 
                                          type="time"
                                          value={currentDayConfig.workHours.start}
                                          onChange={e => updateDaySchedule('workStart', e.target.value)}
                                          className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 pl-3 text-white outline-none focus:border-[#7C3AED] font-mono"
                                      />
                                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm text-gray-400 mb-1">Fim do Expediente</label>
                                  <div className="relative">
                                      <input 
                                          type="time"
                                          value={currentDayConfig.workHours.end}
                                          onChange={e => updateDaySchedule('workEnd', e.target.value)}
                                          className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 pl-3 text-white outline-none focus:border-[#7C3AED] font-mono"
                                      />
                                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                              <div className="col-span-2">
                                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Pausa para Almoço
                                  </h4>
                              </div>
                              <div>
                                  <label className="block text-sm text-gray-400 mb-1">Início da Pausa</label>
                                  <div className="relative">
                                      <input 
                                          type="time"
                                          value={currentDayConfig.lunchBreak.start}
                                          onChange={e => updateDaySchedule('lunchStart', e.target.value)}
                                          className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 pl-3 text-white outline-none focus:border-[#7C3AED] font-mono"
                                      />
                                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm text-gray-400 mb-1">Fim da Pausa</label>
                                  <div className="relative">
                                      <input 
                                          type="time"
                                          value={currentDayConfig.lunchBreak.end}
                                          onChange={e => updateDaySchedule('lunchEnd', e.target.value)}
                                          className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 pl-3 text-white outline-none focus:border-[#7C3AED] font-mono"
                                      />
                                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setIsScheduleModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium">Cancelar</button>
                      <button onClick={handleSaveSchedule} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold shadow-lg shadow-[#7C3AED]/20">
                          Salvar Alterações
                      </button>
                  </div>
              </GlassCard>
          </div>
      )}

    </div>
  );
}
