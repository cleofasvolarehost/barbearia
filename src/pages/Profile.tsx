import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/GlassCard';
import { User, Mail, Calendar, Clock, DollarSign, Scissors } from 'lucide-react';

interface AppointmentWithDetails {
  id: string;
  data: string;
  horario: string;
  status: string;
  preco_total: number;
  barbeiros: {
    nome: string;
  };
  agendamentos_servicos: {
    servicos: {
      nome: string;
    };
  }[];
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      async function fetchAppointments() {
        try {
          const { data, error } = await supabase
            .from('agendamentos')
            .select(`
              id,
              data,
              horario,
              status,
              preco_total,
              barbeiros (
                nome
              ),
              agendamentos_servicos (
                servicos (
                  nome
                )
              )
            `)
            .eq('usuario_id', user.id)
            .order('data', { ascending: false })
            .order('horario', { ascending: false });

          if (error) throw error;
          
          setAppointments(data as any || []);
        } catch (error) {
          console.error('Erro ao buscar agendamentos:', error);
        } finally {
          setLoading(false);
        }
      }

      fetchAppointments();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7C3AED]"></div>
    </div>
  );

  return (
    <div className="bg-[#121212] min-h-screen py-6 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          
          {/* Profile Header */}
          <GlassCard className="mb-6 p-6 border border-white/10 relative overflow-hidden flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-start gap-4">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
            
            <div className="relative z-10 h-20 w-20 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center text-3xl text-white font-bold shadow-lg flex-shrink-0">
                {user?.user_metadata?.nome ? user.user_metadata.nome.charAt(0).toUpperCase() : <User />}
            </div>
            
            <div className="relative z-10 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-white mb-1">
                    {user?.user_metadata?.nome || 'Cliente'}
                </h2>
                <div className="flex items-center justify-center sm:justify-start text-gray-400 text-sm gap-4">
                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {user?.email}</span>
                </div>
            </div>
          </GlassCard>

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#2DD4BF]" /> Meus Agendamentos
          </h3>

          {appointments.length === 0 ? (
            <GlassCard className="text-center py-16 border-dashed border-2 border-white/10">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Você ainda não tem agendamentos.</p>
              <button 
                onClick={() => navigate('/')}
                className="mt-6 text-[#7C3AED] font-bold hover:text-white transition-colors"
              >
                Encontrar uma barbearia &rarr;
              </button>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <GlassCard key={appt.id} className="p-6 hover:bg-white/5 transition-colors border-l-4 border-l-[#7C3AED]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[#2DD4BF] font-bold text-sm uppercase tracking-wider">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(appt.data), 'dd/MM/yyyy')} 
                        <span className="text-gray-600">|</span>
                        <Clock className="w-4 h-4" />
                        {appt.horario.slice(0, 5)}
                      </div>
                      
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-gray-500" />
                        {appt.agendamentos_servicos?.map(s => s.servicos?.nome).join(', ') || 'Serviço não identificado'}
                      </h3>
                      
                      <p className="text-sm text-gray-400 pl-7">
                        Barbeiro: <span className="text-white">{appt.barbeiros?.nome}</span>
                      </p>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                      <p className="text-xl font-bold text-white flex items-center gap-1">
                        <span className="text-sm text-gray-500 font-normal">Total</span>
                        R$ {appt.preco_total.toFixed(2)}
                      </p>
                      
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide border
                        ${appt.status === 'confirmado' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 
                          appt.status === 'pendente' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                          appt.status === 'cancelado' ? 'text-red-400 border-red-400/30 bg-red-400/10' : 'text-gray-400 border-gray-600 bg-gray-800'}`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
