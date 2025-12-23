import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowUpRight, Calendar, DollarSign, Users, Clock, Sparkles, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

// Interfaces
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string; // ISO string
  time?: string;
  category?: string;
}

export default function Finance() {
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todayClients, setTodayClients] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [weekDays, setWeekDays] = useState<string[]>([]);
  
  // Modal/Form State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false); // New state
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'outros' });
  const [paymentSettings, setPaymentSettings] = useState<{
    manual_pix_key: string;
    allow_pay_at_shop: boolean;
    payment_mode: 'checkout_transparent' | 'redirect';
  }>({
    manual_pix_key: '',
    allow_pay_at_shop: true,
    payment_mode: 'checkout_transparent'
  });

  useEffect(() => {
    if (establishment) {
      fetchFinancialData();
      // Load settings
      setPaymentSettings({
        manual_pix_key: establishment.manual_pix_key || '',
        allow_pay_at_shop: establishment.allow_pay_at_shop ?? true,
        payment_mode: establishment.payment_mode || 'checkout_transparent'
      });
    } else if (!establishmentLoading) {
        // Establishment check finished but no establishment found.
        setLoading(false);
    }
  }, [establishment, establishmentLoading]);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const { error } = await supabase
              .from('establishments')
              .update({
                  manual_pix_key: paymentSettings.manual_pix_key,
                  allow_pay_at_shop: paymentSettings.allow_pay_at_shop,
                  payment_mode: paymentSettings.payment_mode
              })
              .eq('id', establishment?.id);

          if (error) throw error;
          toast.success('Configurações de pagamento salvas!');
          setIsPaymentSettingsOpen(false);
      } catch (error) {
          toast.error('Erro ao salvar configurações');
      }
  };

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const startMonth = format(startOfMonth(now), 'yyyy-MM-dd');
      const endMonth = format(endOfMonth(now), 'yyyy-MM-dd');

      // 1. Fetch Appointments (Income)
      const { data: appointments } = await supabase
        .from('agendamentos')
        .select(`
          id, 
          data, 
          horario, 
          preco_total, 
          status,
          usuario:usuarios(nome),
          servicos:agendamentos_servicos(servico:servicos(nome))
        `)
        .eq('establishment_id', establishment?.id)
        .in('status', ['completed', 'confirmed', 'concluido', 'confirmado']); // Adjust status based on your workflow

      // 2. Fetch Expenses
      const { data: expenses } = await supabase
        .from('despesas')
        .select('*')
        .eq('establishment_id', establishment?.id);

      // Process Data
      const allTransactions: Transaction[] = [];
      let totalIncome = 0;
      let totalExpense = 0;
      let todayInc = 0;
      let todayExp = 0;
      let todayCli = 0;

      // Process Income
      appointments?.forEach(app => {
        const amount = Number(app.preco_total) || 0;
        totalIncome += amount;
        
        if (app.data === todayStr) {
          todayInc += amount;
          todayCli++;
        }

        // Service name extraction (a bit complex due to join, simplifying)
        const serviceName = (app.servicos && app.servicos[0] && app.servicos[0].servico) 
          ? (app.servicos[0].servico as any).nome 
          : 'Serviço';

        const clientName = (app.usuario as any)?.nome || 'Cliente';

        allTransactions.push({
          id: app.id,
          type: 'income',
          description: `${clientName} - ${serviceName}`,
          amount: amount,
          date: app.data,
          category: 'servicos'
        });
      });

      // Process Expenses
      expenses?.forEach(exp => {
        const amount = Number(exp.valor) || 0;
        totalExpense += amount;

        if (exp.data_pagamento === todayStr) {
            todayExp += amount;
        }

        allTransactions.push({
            id: exp.id,
            type: 'expense',
            description: exp.descricao,
            amount: amount,
            date: exp.data_pagamento,
            time: '00:00',
            category: exp.categoria
        });
      });

      // Sort by date desc
      allTransactions.sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());

      // Weekly Chart Data
      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
      const daysInterval = eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek });
      
      const weeklyChartData = daysInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return appointments
            ?.filter(app => app.data === dayStr)
            .reduce((sum, app) => sum + (Number(app.preco_total) || 0), 0) || 0;
      });

      const weeklyLabels = daysInterval.map(day => format(day, 'EEE', { locale: ptBR }));

      setBalance(totalIncome - totalExpense);
      setTodayEarnings(todayInc);
      setTodayExpenses(todayExp);
      setTodayClients(todayCli);
      setTransactions(allTransactions);
      setWeeklyData(weeklyChartData);
      setWeekDays(weeklyLabels);

    } catch (error) {
      console.error('Error fetching finance:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    try {
        const { error } = await supabase.from('despesas').insert({
            establishment_id: establishment?.id,
            descricao: newExpense.description,
            valor: parseFloat(newExpense.amount),
            categoria: newExpense.category,
            data_pagamento: format(new Date(), 'yyyy-MM-dd')
        });

        if (error) throw error;

        toast.success('Despesa adicionada!');
        setIsExpenseModalOpen(false);
        setNewExpense({ description: '', amount: '', category: 'outros' });
        fetchFinancialData(); // Refresh
    } catch (error) {
        toast.error('Erro ao salvar despesa');
    }
  };

  const maxEarning = Math.max(...weeklyData, 100); // Prevent div by zero
  const growthPercentage = 0; // To be calculated with real historical data

  if (loading) return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">Carregando Finanças...</div>;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-8 pb-32">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">Financeiro</h1>
            </div>
            <p className="text-white/60 text-sm sm:text-base">Gestão completa do seu negócio</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex-1 sm:flex-none justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-3 rounded-xl flex items-center gap-2 transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" /> <span className="text-sm">Despesa</span>
            </button>
            <button 
              onClick={() => setIsPaymentSettingsOpen(true)}
              className="flex-1 sm:flex-none justify-center bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30 px-4 py-3 rounded-xl flex items-center gap-2 transition-colors font-semibold"
            >
              <DollarSign className="w-4 h-4" /> <span className="text-sm">Receber</span>
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-8 rounded-3xl bg-gradient-to-br from-[#7C3AED]/20 via-[#1a1a1a] to-[#2DD4BF]/10 border-2 border-[#7C3AED]/30 shadow-2xl shadow-[#7C3AED]/20 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Saldo Total (Lucro)</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
                    R$ {balance.toFixed(2)}
                  </h2>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
                  <p className="text-xs text-white/60 mb-1">Próximo Fechamento</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-sm font-bold text-white">Sexta-feira</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-[#10B981]" />
                  <span className="text-sm text-white/60">Entradas Hoje</span>
                </div>
                <p className="text-2xl font-bold text-[#10B981]">+ R$ {todayEarnings.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-white/60">Saídas Hoje</span>
                </div>
                <p className="text-2xl font-bold text-red-500">- R$ {todayExpenses.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold mb-1 text-white">Faturamento da Semana</h3>
              <p className="text-sm text-white/60">Últimos 7 dias</p>
            </div>
          </div>

          <div className="relative h-40 w-full overflow-hidden">
             {/* Simple Bar Chart Visualization for robustness */}
             <div className="flex items-end justify-between h-full px-2 gap-2">
                {weeklyData.map((val, i) => (
                    <div key={i} className="flex flex-col items-center justify-end h-full w-full">
                         <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${(val / maxEarning) * 100}%` }}
                            className="w-full max-w-[40px] bg-gradient-to-t from-[#7C3AED] to-[#2DD4BF] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity"
                         />
                         <p className="text-xs text-gray-400 mt-2">{weekDays[i]}</p>
                    </div>
                ))}
             </div>
          </div>
        </motion.div>

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <h3 className="text-xl font-bold mb-6 text-white">Movimentações Recentes</h3>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Nenhuma movimentação registrada.</p>
            ) : (
                transactions.map((t, index) => (
                <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${t.type === 'income' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                            {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className="font-semibold text-white">{t.description}</h4>
                            <p className="text-xs text-white/60 capitalize">{t.category} • {format(parseISO(t.date), 'dd/MM/yyyy')}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`text-lg font-bold ${t.type === 'income' ? 'text-[#10B981]' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                        </span>
                    </div>
                    </div>
                </motion.div>
                ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-white mb-4">Adicionar Despesa</h2>
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                        <input 
                            type="text" 
                            required
                            value={newExpense.description}
                            onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#7C3AED] outline-none"
                            placeholder="Ex: Conta de Luz"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Valor (R$)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            required
                            value={newExpense.amount}
                            onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#7C3AED] outline-none"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                        <select 
                            value={newExpense.category}
                            onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#7C3AED] outline-none [&>option]:bg-[#121212]"
                        >
                            <option value="aluguel">Aluguel</option>
                            <option value="produtos">Produtos</option>
                            <option value="energia">Energia/Água</option>
                            <option value="marketing">Marketing</option>
                            <option value="salarios">Salários/Comissões</option>
                            <option value="outros">Outros</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsExpenseModalOpen(false)}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                        >
                            Salvar Despesa
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
      )}

      {/* Payment Settings Modal */}
      {isPaymentSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <GlassCard className="w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-white mb-4">Configurações de Recebimento</h2>
                <form onSubmit={handleSavePaymentSettings} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Modo de Pagamento</label>
                        <select 
                            value={paymentSettings.payment_mode}
                            onChange={e => setPaymentSettings({...paymentSettings, payment_mode: e.target.value as any})}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#7C3AED] outline-none [&>option]:bg-[#121212]"
                        >
                            <option value="checkout_transparent">Checkout Transparente</option>
                            <option value="redirect">Redirecionamento</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Chave Pix Manual (Seu CPF/CNPJ/Email)</label>
                        <input 
                            type="text" 
                            value={paymentSettings.manual_pix_key}
                            onChange={e => setPaymentSettings({...paymentSettings, manual_pix_key: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#7C3AED] outline-none"
                            placeholder="Ex: 123.456.789-00"
                        />
                        <p className="text-xs text-gray-500 mt-1">O cliente verá essa chave e enviará o comprovante.</p>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <input 
                            type="checkbox"
                            id="allow_pay_at_shop"
                            checked={paymentSettings.allow_pay_at_shop}
                            onChange={e => setPaymentSettings({...paymentSettings, allow_pay_at_shop: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-600 text-[#7C3AED] focus:ring-[#7C3AED] bg-transparent"
                        />
                        <label htmlFor="allow_pay_at_shop" className="text-sm text-white cursor-pointer select-none">
                            Permitir "Pagar na Barbearia"
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsPaymentSettingsOpen(false)}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 rounded-xl bg-[#7C3AED] text-white font-bold hover:bg-[#6D28D9] transition-colors shadow-lg shadow-[#7C3AED]/20"
                        >
                            Salvar Configuração
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.5); border-radius: 10px; }
      `}</style>
    </div>
  );
}
