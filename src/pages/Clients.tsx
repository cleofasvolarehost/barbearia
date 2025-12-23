import { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Search, Plus, MoreVertical, Phone, Mail, User, Check, X, Calendar, Award, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
  totalVisits: number;
  status: 'active' | 'inactive';
  avatarColor: string;
  loyalty?: {
    points: number;
    hasReward: boolean;
  };
}

export default function Clients() {
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
      name: '',
      phone: '',
      email: '',
      birthDate: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (establishment) {
      fetchClients();
    } else if (!establishmentLoading) {
      setLoading(false);
    }
  }, [establishment, establishmentLoading]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Fetch churn analysis
      const { data, error } = await supabase
        .from('churn_analysis_view')
        .select('*')
        .eq('establishment_id', establishment?.id);

      if (error) throw error;

      // Fetch loyalty cards separately (or join if possible, but separate is easier for now)
      const { data: loyaltyCards } = await supabase
        .from('loyalty_cards')
        .select('user_id, points')
        .eq('establishment_id', establishment?.id);

      const loyaltyMap = new Map();
      if (loyaltyCards) {
          loyaltyCards.forEach((card: any) => {
              loyaltyMap.set(card.user_id, card.points);
          });
      }

      const formattedClients: Client[] = (data || []).map((row: any) => {
        const lastVisitDate = parseISO(row.last_visit_date);
        const daysAgo = Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const colors = ['#7C3AED', '#2DD4BF', '#F97316', '#3B82F6', '#10B981', '#EC4899'];
        const colorIndex = row.client_name ? row.client_name.charCodeAt(0) % colors.length : 0;

        const points = loyaltyMap.get(row.client_id) || 0;
        const totalCuts = 10;
        // Logic: Points accumulate. Reward available every 10 points.
        // Assuming points count *up* and don't reset until redeem (or logic handles it).
        // Let's assume: hasReward if points >= 10.
        const hasReward = points >= totalCuts;

        return {
          id: row.client_id,
          name: row.client_name || 'Sem nome',
          email: '-', 
          phone: row.client_phone || '-',
          lastVisit: formatDistanceToNow(lastVisitDate, { addSuffix: true, locale: ptBR }),
          totalVisits: row.total_visits,
          status: daysAgo <= 45 ? 'active' : 'inactive',
          avatarColor: colors[colorIndex],
          loyalty: {
              points: points % totalCuts, // Show progress 0-9
              hasReward: hasReward
          }
        };
      });

      setClients(formattedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
      e.preventDefault();
      setCreating(true);

      try {
          // 1. Check if phone exists in usuarios
          let userId = null;
          
          const { data: existingUser } = await supabase
              .from('usuarios')
              .select('id')
              .eq('telefone', newClient.phone)
              .single();
          
          if (existingUser) {
              userId = existingUser.id;
              toast('Cliente já existe no sistema global. Vinculando...', { icon: '🔗' });
          } else {
              // 2. Create Ghost User
              const { data: newUser, error: createError } = await supabase
                  .from('usuarios')
                  .insert({
                      nome: newClient.name,
                      telefone: newClient.phone,
                      email: newClient.email || null,
                      data_nascimento: newClient.birthDate || null,
                      tipo: 'client'
                  })
                  .select()
                  .single();
              
              if (createError) throw createError;
              userId = newUser.id;
              toast.success('Novo cliente cadastrado!');
          }

          // 3. Since we don't have a direct 'clients' table (it's derived from appointments), 
          // we can't explicitly "link" them unless we create a dummy appointment or have a clients table.
          // However, for "Walk-in" flow, the user usually wants to book immediately.
          // Let's ask if they want to book now.
          
          setIsModalOpen(false);
          setNewClient({ name: '', phone: '', email: '', birthDate: '' });
          
          // Refresh list (might not show new client if no appointments yet, unless we change view logic)
          // Ideally, we should redirect to booking or open booking modal.
          if (confirm('Cliente cadastrado! Deseja agendar um horário agora?')) {
              // Redirect to Booking Page (or open modal if we implemented it here)
              // For now, redirect to Admin Dashboard where calendar is
              // Ideally we pass the client ID to pre-select.
              // But AdminDashboard doesn't support pre-select yet.
              // Let's just go there.
              window.location.href = '/admin/dashboard';
          } else {
              fetchClients(); // Refresh list (might be empty for this new client)
          }

      } catch (error: any) {
          console.error('Create client error:', error);
          toast.error(error.message || 'Erro ao criar cliente');
      } finally {
          setCreating(false);
      }
  };

  const handleRedeemReward = async (clientId: string) => {
    if (!confirm('Confirmar resgate do prêmio? Isso descontará 10 pontos do cliente.')) return;

    try {
      const { error } = await supabase.rpc('redeem_loyalty_points', {
        p_user_id: clientId,
        p_establishment_id: establishment?.id,
        p_points: 10
      });

      if (error) throw error;

      toast.success('Prêmio resgatado com sucesso!');
      fetchClients(); // Refresh list
    } catch (error: any) {
      console.error('Error redeeming:', error);
      toast.error('Erro ao resgatar prêmio: ' + error.message);
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  if (establishmentLoading || (loading && establishment)) return <div className="p-8 text-white">Carregando clientes...</div>;

  if (!establishment) return (
      <div className="p-8 text-white flex flex-col items-center">
          <p className="mb-4">Nenhuma barbearia configurada.</p>
          <a href="/admin/setup" className="px-4 py-2 bg-[#7C3AED] rounded-lg text-white font-bold">
              Configurar Agora
          </a>
      </div>
  );

  return (
    <div className="space-y-6 p-6 pb-24">
      {/* Modal */}
      <AnimatePresence>
          {isModalOpen && (
              <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setIsModalOpen(false)} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                >
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg pointer-events-auto shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Novo Cliente (Walk-in)</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        required
                                        value={newClient.name}
                                        onChange={e => setNewClient({...newClient, name: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Telefone (Obrigatório)</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        required
                                        value={newClient.phone}
                                        onChange={e => setNewClient({...newClient, phone: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email (Opcional)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input 
                                            type="email"
                                            value={newClient.email}
                                            onChange={e => setNewClient({...newClient, email: e.target.value})}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                            placeholder="joao@email.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nascimento</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input 
                                            type="date"
                                            value={newClient.birthDate}
                                            onChange={e => setNewClient({...newClient, birthDate: e.target.value})}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4">
                                <button type="submit" disabled={creating} className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold transition-colors flex items-center justify-center gap-2">
                                    {creating ? 'Cadastrando...' : <><Check className="w-4 h-4" /> Cadastrar Cliente</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Clientes</h1>
          <p className="text-white/60 text-sm">Gerencie sua base de clientes ({clients.length})</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..." 
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#7C3AED] transition-all text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] transition-colors font-bold shadow-lg whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="md:inline">Novo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredClients.length === 0 ? (
           <GlassCard className="p-8 text-center text-gray-400">
             <p>Nenhum cliente encontrado.</p>
           </GlassCard>
        ) : (
          filteredClients.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="p-4" hover>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Header / Main Info */}
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: client.avatarColor }}
                    >
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium truncate">{client.name}</h3>
                          {/* Mobile Status Badge */}
                          <span className={`md:hidden px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            client.status === 'active' 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : 'bg-white/5 text-white/40 border border-white/10'
                          }`}>
                            {client.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-white/40">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {client.email}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {client.phone}
                        </span>
                        
                        {/* Loyalty Status (Mobile/Desktop) */}
                        <div className="flex items-center gap-2 mt-1 md:mt-0">
                           <Award className={`w-3 h-3 ${client.loyalty?.hasReward ? 'text-yellow-400' : 'text-emerald-400'}`} />
                           <span className={`${client.loyalty?.hasReward ? 'text-yellow-400 font-bold' : 'text-emerald-400'}`}>
                             {client.loyalty?.hasReward ? 'Prêmio Disponível!' : `${client.loyalty?.points || 0}/10 Pontos`}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
                    <div className="flex gap-6">
                        <div className="text-left md:text-right">
                        <p className="text-white/40 text-xs uppercase tracking-wider">Última Visita</p>
                        <p className="text-white text-sm">{client.lastVisit}</p>
                        </div>
                        <div className="text-left md:text-right">
                        <p className="text-white/40 text-xs uppercase tracking-wider">Visitas</p>
                        <p className="text-white text-sm">{client.totalVisits}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Redeem Button */}
                        {client.loyalty?.hasReward && (
                            <button 
                                onClick={() => handleRedeemReward(client.id)}
                                className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-lg text-xs font-bold hover:bg-yellow-500/30 transition-colors flex items-center gap-1"
                            >
                                <Gift className="w-3 h-3" />
                                Resgatar
                            </button>
                        )}
                        
                        {/* Desktop Status Badge */}
                        <div className={`hidden md:block px-3 py-1 rounded-full text-xs ${
                        client.status === 'active' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}>
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </div>
                        
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white">
                        <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
