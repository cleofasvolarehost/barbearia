import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { Filter, Download, CheckCircle, XCircle, Clock, Edit2, Ban, Trash2, Shield, Calendar, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SubscriptionEditModal } from '../../components/modals/SubscriptionEditModal';

export default function SuperAdminSubscriptions() {
  const [viewMode, setViewMode] = useState<'subscriptions' | 'payments'>('subscriptions');
  
  // Data
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Modals
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (viewMode === 'payments') {
      fetchPayments();
    } else {
      fetchSubscriptions();
    }
  }, [viewMode]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_payments')
        .select(`
            *,
            establishment:establishment_id (
                name
            )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, subscription_status, subscription_plan, subscription_end_date, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubscription = (sub: any) => {
    setSelectedSubscription(sub);
    setIsEditModalOpen(true);
  };

  const handleCancelSubscription = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura? O estabelecimento perderá acesso aos recursos pagos.')) return;
    
    try {
      const { error } = await supabase
        .from('establishments')
        .update({ subscription_status: 'canceled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Assinatura cancelada');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Erro ao cancelar');
    }
  };

  const handleDeleteSubscriptionData = async (id: string) => {
    if (!confirm('ATENÇÃO: Isso removerá os dados de assinatura deste estabelecimento (Status -> None). Continuar?')) return;

    try {
      const { error } = await supabase
        .from('establishments')
        .update({ 
            subscription_status: 'none',
            subscription_plan: 'free',
            subscription_end_date: null
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Dados de assinatura removidos');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Erro ao remover dados');
    }
  };

  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(p => p.status === filter);

  const getStatusIcon = (status: string) => {
      switch(status) {
          case 'paid': 
          case 'active':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
          case 'pending': 
          case 'trialing':
            return <Clock className="w-5 h-5 text-yellow-500" />;
          case 'failed': 
          case 'canceled':
          case 'suspended':
            return <XCircle className="w-5 h-5 text-red-500" />;
          default: return <Clock className="w-5 h-5 text-gray-500" />;
      }
  };

  const getStatusLabel = (status: string) => {
      const map: any = {
          'active': 'Ativo',
          'trialing': 'Em Teste',
          'past_due': 'Atrasado',
          'canceled': 'Cancelado',
          'suspended': 'Suspenso',
          'none': 'Sem Assinatura',
          'paid': 'Pago',
          'pending': 'Pendente',
          'failed': 'Falhou'
      };
      return map[status] || status;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gestão de Assinaturas (SaaS)</h1>
            <p className="text-gray-400">Gerencie planos, renovações e pagamentos.</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-white/5 p-1 rounded-xl">
             <button
                onClick={() => setViewMode('subscriptions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'subscriptions' ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
            >
                <Shield className="w-4 h-4" />
                Assinaturas Ativas
            </button>
            <button
                onClick={() => setViewMode('payments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'payments' ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
            >
                <Download className="w-4 h-4" />
                Histórico de Pagamentos
            </button>
        </div>
      </div>

      {/* SUBSCRIPTIONS VIEW */}
      {viewMode === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
                <GlassCard key={sub.id} className="p-6 group hover:border-[#7C3AED]/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Info */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-[#7C3AED]/20 to-[#7C3AED]/5 border border-[#7C3AED]/20">
                                <Store className="w-6 h-6 text-[#7C3AED]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{sub.name}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        sub.subscription_status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                        sub.subscription_status === 'canceled' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                    }`}>
                                        {getStatusIcon(sub.subscription_status)}
                                        {getStatusLabel(sub.subscription_status)}
                                    </span>
                                    <span className="text-gray-500 text-sm">•</span>
                                    <span className="text-gray-300 text-sm font-medium">Plano {sub.subscription_plan}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    Renova em: {sub.subscription_end_date ? new Date(sub.subscription_end_date).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleEditSubscription(sub)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Editar Assinatura"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                            
                            {sub.subscription_status !== 'canceled' && (
                                <button 
                                    onClick={() => handleCancelSubscription(sub.id)}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Cancelar Assinatura"
                                >
                                    <Ban className="w-5 h-5" />
                                </button>
                            )}
                            
                            <button 
                                onClick={() => handleDeleteSubscriptionData(sub.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remover Dados (Reset)"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </GlassCard>
            ))}

            {subscriptions.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    Nenhuma assinatura encontrada.
                </div>
            )}
          </div>
      )}

      {/* PAYMENTS VIEW */}
      {viewMode === 'payments' && (
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex justify-end mb-4">
                 <div className="flex bg-white/5 p-1 rounded-xl">
                    {[
                        { key: 'all', label: 'Todos' },
                        { key: 'paid', label: 'Pago' },
                        { key: 'pending', label: 'Pendente' },
                        { key: 'failed', label: 'Falhou' }
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                                filter === f.key ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {filteredPayments.map((payment) => (
                <GlassCard key={payment.id} className="p-4 flex items-center justify-between group hover:border-[#7C3AED]/30 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-white/5 group-hover:bg-[#7C3AED]/10 transition-colors">
                            {getStatusIcon(payment.status)}
                        </div>
                        <div>
                            <h4 className="font-bold text-white">R$ {Number(payment.amount).toFixed(2)}</h4>
                            <p className="text-sm text-gray-400">
                                {payment.establishment?.name || 'Barbearia Desconhecida'} • {payment.payment_method || 'PIX'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">
                            {new Date(payment.created_at).toLocaleDateString()} às {new Date(payment.created_at).toLocaleTimeString()}
                        </p>
                        {payment.invoice_url && (
                            <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED] hover:underline flex items-center justify-end gap-1">
                                <Download className="w-3 h-3" /> Invoice
                            </a>
                        )}
                    </div>
                </GlassCard>
            ))}
             {filteredPayments.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    Nenhum pagamento encontrado.
                </div>
            )}
          </div>
      )}

      {/* EDIT MODAL */}
      <SubscriptionEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        subscription={selectedSubscription}
        onUpdate={fetchSubscriptions}
      />

    </div>
  );
}
