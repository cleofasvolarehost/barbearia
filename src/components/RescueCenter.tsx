import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MessageCircle, Phone, TrendingDown, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

interface ClientAtRisk {
  id: string;
  name: string;
  lastVisit: number; // dias atrás
  phone: string;
  totalVisits: number;
  lifetimeValue: number;
}

interface RescueCenterProps {
  onBack?: () => void;
}

export function RescueCenter({ onBack }: RescueCenterProps) {
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const [clientsAtRisk, setClientsAtRisk] = useState<ClientAtRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (establishment) {
        const fetchChurnRisk = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                .from('churn_analysis_view')
                .select('*')
                .eq('establishment_id', establishment.id);

                if (error) throw error;

                const now = new Date();
                const clients = (data || [])
                .map((row: any) => {
                    const lastVisitDate = parseISO(row.last_visit_date);
                    const daysAgo = differenceInDays(now, lastVisitDate);
                    
                    return {
                    id: row.client_id,
                    name: row.client_name || 'Cliente sem nome',
                    lastVisit: daysAgo,
                    phone: row.client_phone || '',
                    totalVisits: row.total_visits,
                    lifetimeValue: row.ltv
                    };
                })
                .filter(c => c.lastVisit >= 30) // Only show if absent for 30+ days
                .sort((a, b) => b.lastVisit - a.lastVisit); // Most critical first

                setClientsAtRisk(clients);
            } catch (error) {
                console.error('Error fetching churn risk:', error);
                toast.error('Erro ao carregar dados de risco.');
            } finally {
                setLoading(false);
            }
        };
        fetchChurnRisk();
    } else if (!establishmentLoading) {
        setLoading(false);
    }
  }, [establishment?.id, establishmentLoading]);

  const handleRecoverClient = (client: ClientAtRisk) => {
    if (!client.phone) {
        toast.error('Cliente sem telefone cadastrado.');
        return;
    }

    setSendingTo(client.id);
    
    // Simula o envio da mensagem
    setTimeout(() => {
      setSendingTo(null);
      
      // Abre o WhatsApp com mensagem pré-formatada
      const message = encodeURIComponent(
        `Olá ${client.name.split(' ')[0]}! 😊 Sentimos sua falta por aqui! Que tal agendar um horário? Temos uma oferta especial para você! 💈✨`
      );
      window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }, 1000);
  };

  const getRiskLevel = (days: number) => {
    if (days >= 50) return { label: 'Crítico', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    if (days >= 40) return { label: 'Alto', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    return { label: 'Médio', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
  };

  const totalAtRisk = clientsAtRisk.length;
  const totalRevenueLost = clientsAtRisk.reduce((sum, client) => sum + client.lifetimeValue, 0);
  const avgDaysAway = totalAtRisk > 0 ? Math.round(clientsAtRisk.reduce((sum, client) => sum + client.lastVisit, 0) / totalAtRisk) : 0;

  if (loading) return <div className="p-8 text-white text-center">Calculando riscos...</div>;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4">
      {/* Header com stats */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[#121212] via-[#121212] to-transparent pb-4">
        <div className="pt-2 pb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Central de Recuperação</h1>
                <p className="text-sm text-gray-400">Clientes em Risco de Abandono</p>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20"
            >
              <Users className="w-4 h-4 text-red-400 mb-1" />
              <p className="text-xl font-black text-white">{totalAtRisk}</p>
              <p className="text-xs text-gray-400">Em Risco</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20"
            >
              <TrendingDown className="w-4 h-4 text-orange-400 mb-1" />
              <p className="text-xl font-black text-white">R$ {(totalRevenueLost / 1000).toFixed(1)}k</p>
              <p className="text-xs text-gray-400">Em Risco</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-400 mb-1" />
              <p className="text-xl font-black text-white">{avgDaysAway}d</p>
              <p className="text-xs text-gray-400">Média</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Lista de Clientes em Risco */}
      <div className="pb-8 space-y-3">
        {clientsAtRisk.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
                <p>Nenhum cliente em risco no momento! 🎉</p>
            </div>
        ) : (
            clientsAtRisk.map((client, index) => {
            const risk = getRiskLevel(client.lastVisit);
            const isSending = sendingTo === client.id;

            return (
                <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`
                    p-4 rounded-2xl backdrop-blur-xl 
                    bg-gradient-to-br from-white/5 to-white/[0.02] 
                    border ${risk.border}
                    hover:from-white/8 transition-all
                `}
                >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                    <h3 className="font-bold text-white mb-1">{client.name}</h3>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${risk.color}`}>
                        Última visita: {client.lastVisit} dias atrás
                        </span>
                    </div>
                    </div>
                    
                    {/* Badge de Risco */}
                    <div className={`px-2 py-1 rounded-lg ${risk.bg} ${risk.border} border`}>
                    <span className={`text-xs font-bold ${risk.color}`}>{risk.label}</span>
                    </div>
                </div>

                {/* Stats do Cliente */}
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                    <div>
                    <span className="text-gray-500">Total de visitas:</span>{' '}
                    <span className="text-white font-semibold">{client.totalVisits}</span>
                    </div>
                    <div>
                    <span className="text-gray-500">LTV:</span>{' '}
                    <span className="text-white font-semibold">R$ {client.lifetimeValue}</span>
                    </div>
                </div>

                {/* Botão de Recuperação */}
                <motion.button
                    onClick={() => handleRecoverClient(client)}
                    disabled={isSending}
                    whileTap={{ scale: isSending ? 1 : 0.95 }}
                    className={`
                    w-full py-3 px-4 rounded-xl font-bold text-sm
                    flex items-center justify-center gap-2
                    transition-all duration-300
                    ${
                        isSending
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 cursor-wait'
                        : 'bg-gradient-to-r from-[#10B981] to-[#14B8A6] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-[1.02]'
                    }
                    `}
                    style={{
                    boxShadow: isSending ? '0 0 20px rgba(16, 185, 129, 0.5)' : undefined,
                    }}
                >
                    {isSending ? (
                    <>
                        <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                        <MessageCircle className="w-5 h-5" />
                        </motion.div>
                        <span>Enviando mensagem...</span>
                    </>
                    ) : (
                    <>
                        <MessageCircle className="w-5 h-5" />
                        <span>Recuperar via WhatsApp</span>
                    </>
                    )}
                </motion.button>
                </motion.div>
            );
            })
        )}
      </div>

      {/* Footer com dica */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pointer-events-none"
      >
        <div className="max-w-md mx-auto p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 pointer-events-auto">
          <p className="text-xs text-center text-gray-300">
            💡 <span className="text-emerald-400 font-semibold">Dica:</span> Clientes que não voltam há 30+ dias têm 70% de chance de churn. Aja rápido!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
