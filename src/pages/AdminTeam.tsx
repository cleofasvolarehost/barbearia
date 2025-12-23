import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { GlassCard } from '../components/GlassCard';
import { Plus, Trash2, Calendar, User, Mail, Lock, Check, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Types
interface Barber {
  id: string;
  nome: string;
  foto_url?: string;
  ativo: boolean;
  user_id?: string;
  work_days?: number[]; // [0,1,2,3,4,5,6]
  work_hours_start?: string; // "09:00"
  work_hours_end?: string;   // "18:00"
  schedule_config?: {
    workHours: { start: string; end: string };
    lunchBreak: { start: string; end: string };
  };
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
  const [schedule, setSchedule] = useState({
      days: [] as number[],
      start: '09:00',
      end: '19:00',
      lunchStart: '12:00',
      lunchEnd: '13:00'
  });

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
        // 1. Create Auth User (using temporary client to allow creation without logging out)
        // Note: In a real prod app, you might use an Edge Function for this to avoid exposing anon key limits or use Invite logic
        // For this MVP, we use a second client instance or assume the current user has permissions (which they don't usually to create other users)
        // SOLUTION: We'll create a "Profile" first (the 'barbeiros' row) and a "Invite" mechanism ideally. 
        // BUT to follow the prompt "Create auth user", we need the service_role or an Edge Function.
        // FALLBACK: We will invoke an Edge Function or RPC if available. 
        // Since we don't have a 'create_barber' RPC, I'll create the row in 'barbeiros' first, 
        // and for the LOGIN part, we'll simulate or use a placeholder if we can't create Auth.
        // HOWEVER, the prompt says "Create auth user with role='barber'".
        // I'll assume we can use the `create_shop_and_owner` logic pattern or just insert into `barbeiros` and let them register?
        // No, let's try to create the user via the `supabase.auth.signUp` if we were not logged in, but we are.
        // CORRECT APPROACH FOR MVP: Just create the 'barbeiros' record. The auth user creation usually requires admin rights or a specific flow.
        // Let's create the 'barbeiros' record and maybe a 'usuarios' record if possible?
        // Actually, let's just insert into 'barbeiros' for the "Profile" to appear in booking. 
        // Login access can be a "Future Step" or we use a simple "Invite Link".
        
        // RE-READING PROMPT: "Form: Name, Email, Password (create auth user with role='barber')"
        // To do this from the client side while logged in as Owner, we need a secondary unauthenticated client or an Admin function.
        // I will implement a direct insert to `barbeiros` for the display, and show a toast explaining Auth limitation or use a mock ID.
        
        // Wait! We can use the same `create_shop_and_owner` RPC pattern? No.
        // Let's use the `createClient` trick with the ANON key, but that logs us out? No, `createClient` creates a new instance.
        
        const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: newBarber.email,
            password: newBarber.password,
            options: {
                data: {
                    nome: newBarber.name,
                    tipo: 'barber',
                    establishment_id: establishment.id // Custom claim or metadata
                }
            }
        });

        if (authError) throw authError;
        
        // 2. Insert into 'barbeiros' (The public profile)
        if (authData.user) {
            const { error: dbError } = await supabase.from('barbeiros').insert({
                establishment_id: establishment.id,
                nome: newBarber.name,
                user_id: authData.user.id,
                ativo: true
            });
            if (dbError) throw dbError;
            
            // 3. Insert into 'usuarios' (Our custom users table)
            await supabase.from('usuarios').upsert({
                id: authData.user.id,
                email: newBarber.email,
                nome: newBarber.name,
                tipo: 'barber'
            });

            toast.success('Barbeiro cadastrado com sucesso!');
            setIsAddModalOpen(false);
            setNewBarber({ name: '', email: '', password: '' });
            fetchTeam();
        }

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
          const scheduleConfig = {
              workHours: { start: schedule.start, end: schedule.end },
              lunchBreak: { start: schedule.lunchStart, end: schedule.lunchEnd }
          };

          const { error } = await supabase
            .from('barbeiros')
            .update({
                work_days: schedule.days,
                work_hours_start: schedule.start,
                work_hours_end: schedule.end,
                schedule_config: scheduleConfig
            })
            .eq('id', selectedBarber.id);

          if (error) throw error;
          toast.success('Horários atualizados!');
          setIsScheduleModalOpen(false);
          fetchTeam();
      } catch (error) {
          toast.error('Erro ao salvar horários.');
      }
  };

  const toggleDay = (day: number) => {
      if (schedule.days.includes(day)) {
          setSchedule({ ...schedule, days: schedule.days.filter(d => d !== day) });
      } else {
          setSchedule({ ...schedule, days: [...schedule.days, day].sort() });
      }
  };

  const openScheduleModal = (barber: Barber) => {
      setSelectedBarber(barber);
      
      const config = barber.schedule_config || {
          workHours: { start: barber.work_hours_start || '09:00', end: barber.work_hours_end || '19:00' },
          lunchBreak: { start: '12:00', end: '13:00' }
      };

      setSchedule({
          days: barber.work_days || [1, 2, 3, 4, 5, 6], // Default Mon-Sat
          start: config.workHours.start,
          end: config.workHours.end,
          lunchStart: config.lunchBreak.start,
          lunchEnd: config.lunchBreak.end
      });
      setIsScheduleModalOpen(true);
  };

  const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <GlassCard className="max-w-md w-full p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Horários de Trabalho</h2>
                  
                  <div className="mb-6">
                      <label className="block text-sm text-gray-400 mb-2">Dias da Semana</label>
                      <div className="flex flex-wrap gap-2">
                          {daysMap.map((day, index) => (
                              <button
                                  key={index}
                                  onClick={() => toggleDay(index)}
                                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                                      schedule.days.includes(index) 
                                          ? 'bg-[#7C3AED] text-white' 
                                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                  }`}
                              >
                                  {day}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Início do Expediente</label>
                          <input 
                              type="time"
                              value={schedule.start}
                              onChange={e => setSchedule({...schedule, start: e.target.value})}
                              className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-white outline-none focus:border-[#7C3AED]"
                          />
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Fim do Expediente</label>
                          <input 
                              type="time"
                              value={schedule.end}
                              onChange={e => setSchedule({...schedule, end: e.target.value})}
                              className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-white outline-none focus:border-[#7C3AED]"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 border-t border-white/10 pt-4">
                      <div className="col-span-2">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Pausa para Almoço
                          </h4>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Início da Pausa</label>
                          <input 
                              type="time"
                              value={schedule.lunchStart}
                              onChange={e => setSchedule({...schedule, lunchStart: e.target.value})}
                              className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-white outline-none focus:border-[#7C3AED]"
                          />
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Fim da Pausa</label>
                          <input 
                              type="time"
                              value={schedule.lunchEnd}
                              onChange={e => setSchedule({...schedule, lunchEnd: e.target.value})}
                              className="w-full bg-black/20 border border-white/10 rounded-xl p-2 text-white outline-none focus:border-[#7C3AED]"
                          />
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setIsScheduleModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white">Cancelar</button>
                      <button onClick={handleSaveSchedule} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold">Salvar</button>
                  </div>
              </GlassCard>
          </div>
      )}

    </div>
  );
}
