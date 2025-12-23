import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { GlassCard } from '../components/GlassCard';
import { Plus, Edit, Trash2, Crown, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ShopPlan } from '../types/database';

export default function AdminPlans() {
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const [plans, setPlans] = useState<ShopPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ShopPlan | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    days_valid: '30',
    max_cuts: '' // Empty means unlimited
  });

  const fetchPlans = async () => {
    if (!establishment) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_plans')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('price');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (establishment) {
        fetchPlans();
    } else if (!establishmentLoading) {
        setLoading(false);
    }
  }, [establishment, establishmentLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishment) return;

    try {
      const payload = {
        establishment_id: establishment.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        days_valid: parseInt(formData.days_valid),
        max_cuts: formData.max_cuts ? parseInt(formData.max_cuts) : null,
        active: true
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('shop_plans')
          .update(payload)
          .eq('id', editingPlan.id);
        if (error) throw error;
        toast.success('Plano atualizado!');
      } else {
        const { error } = await supabase
          .from('shop_plans')
          .insert(payload);
        if (error) throw error;
        toast.success('Plano criado!');
      }

      setIsModalOpen(false);
      setEditingPlan(null);
      setFormData({ name: '', description: '', price: '', days_valid: '30', max_cuts: '' });
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este plano?')) return;
    try {
      const { error } = await supabase.from('shop_plans').update({ active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Plano desativado.');
      fetchPlans();
    } catch (error) {
      toast.error('Erro ao desativar.');
    }
  };

  const openModal = (plan?: ShopPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price.toString(),
        days_valid: plan.days_valid.toString(),
        max_cuts: plan.max_cuts?.toString() || ''
      });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', description: '', price: '', days_valid: '30', max_cuts: '' });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-white">Carregando planos...</div>;

  return (
    <div className="p-4 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Crown className="w-8 h-8 text-[#FFD700]" /> Barber Club
        </h1>
        <button
          onClick={() => openModal()}
          className="w-full sm:w-auto bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold shadow-lg"
        >
          <Plus className="w-5 h-5" /> Novo Plano
        </button>
      </div>

      {plans.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-white/5 p-4 rounded-full mb-4">
            <Crown className="w-12 h-12 text-[#FFD700]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Nenhum plano ativo</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Crie planos de assinatura para fidelizar seus clientes e gerar receita recorrente.
          </p>
          <button
            onClick={() => openModal()}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl flex items-center gap-2 transition-all font-bold"
          >
            <Plus className="w-5 h-5" /> Criar Primeiro Plano
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <GlassCard key={plan.id} className="p-6 group relative hover:border-[#FFD700]/50 transition-colors border border-white/10">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3" /> VIP
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(plan)} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-gray-400 text-sm mb-4 h-10 line-clamp-2">{plan.description || 'Sem descrição'}</p>
              
              <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Válido por {plan.days_valid} dias</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{plan.max_cuts ? `${plan.max_cuts} cortes/período` : 'Cortes Ilimitados'}</span>
                  </div>
              </div>

              <div className="flex justify-between items-center border-t border-white/10 pt-4">
                <span className="text-2xl font-bold text-white">R$ {plan.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">/mês</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingPlan ? 'Editar Plano' : 'Novo Plano VIP'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Plano</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                  placeholder="Ex: Clube do Corte"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Validade (dias)</label>
                  <input
                    required
                    type="number"
                    value={formData.days_valid}
                    onChange={e => setFormData({...formData, days_valid: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Limite de Cortes (Opcional)</label>
                <input
                  type="number"
                  value={formData.max_cuts}
                  onChange={e => setFormData({...formData, max_cuts: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                  placeholder="Deixe vazio para Ilimitado"
                />
                <p className="text-xs text-gray-500 mt-1">Se preenchido, o cliente só poderá agendar X vezes neste período com preço zero.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED] h-24 resize-none"
                  placeholder="Benefícios do plano..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
