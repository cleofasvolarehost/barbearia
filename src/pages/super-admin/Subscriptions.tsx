import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { Filter, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SuperAdminSubscriptions() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  useEffect(() => {
    fetchPayments();
  }, []);

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

  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(p => p.status === filter);

  const getStatusIcon = (status: string) => {
      switch(status) {
          case 'paid': return <CheckCircle className="w-5 h-5 text-green-500" />;
          case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
          case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
          default: return <Clock className="w-5 h-5 text-gray-500" />;
      }
  };

  if (loading) return <div className="p-8 text-white">Carregando Assinaturas...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Gestão de Assinaturas (SaaS)</h1>
        
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

      <div className="space-y-4">
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

        {filteredPayments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
                Nenhum pagamento encontrado.
            </div>
        )}
      </div>
    </div>
  );
}
