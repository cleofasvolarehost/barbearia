import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { Plus, Edit2, Archive, CheckCircle, XCircle, Star, Save, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SaasPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval_days: number;
  features: string[];
  is_active: boolean;
  is_recommended: boolean;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    interval_days: '30',
    features: '',
    is_active: true,
    is_recommended: false
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan?: SaasPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price.toString(),
        interval_days: plan.interval_days.toString(),
        features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
        is_active: plan.is_active,
        is_recommended: plan.is_recommended
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        interval_days: '30',
        features: '',
        is_active: true,
        is_recommended: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        interval_days: parseInt(formData.interval_days),
        features: formData.features.split('\n').filter(f => f.trim()),
        is_active: formData.is_active,
        is_recommended: formData.is_recommended
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('saas_plans')
          .update(payload)
          .eq('id', editingPlan.id);
        if (error) throw error;
        toast.success('Plano atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('saas_plans')
          .insert([payload]);
        if (error) throw error;
        toast.success('Plano criado com sucesso!');
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const toggleStatus = async (plan: SaasPlan) => {
    try {
      const { error } = await supabase
        .from('saas_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      toast.success(`Plano ${!plan.is_active ? 'ativado' : 'desativado'}!`);
      fetchPlans();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (plan: SaasPlan) => {
    if (!window.confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('saas_plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;
      toast.success('Plano excluído com sucesso!');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  if (loading) return <div className="p-8 text-white">Carregando Planos...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Gerenciar Planos SaaS</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          <Plus className="w-5 h-5" /> Novo Plano
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <GlassCard key={plan.id} className={`p-6 relative group ${!plan.is_active ? 'opacity-50' : ''}`}>
            {plan.is_recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Recomendado
              </div>
            )}

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400">{plan.interval_days} dias</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#2DD4BF]">R$ {plan.price}</span>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-6 h-10 line-clamp-2">{plan.description}</p>

            <ul className="space-y-2 mb-6 h-32 overflow-y-auto custom-scrollbar">
              {Array.isArray(plan.features) && plan.features.map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

              <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-2">
                <button
                  onClick={() => toggleStatus(plan)}
                  className={`text-sm flex items-center gap-1 ${plan.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                >
                  {plan.is_active ? <><Archive className="w-4 h-4" /> Arquivar</> : <><CheckCircle className="w-4 h-4" /> Ativar</>}
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenModal(plan)}
                    className="text-sm flex items-center gap-1 text-[#7C3AED] hover:text-[#9F67FF]"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>

                  <button
                    onClick={() => handleDelete(plan)}
                    className="text-sm flex items-center gap-1 text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </div>
              </div>
          </GlassCard>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7C3AED] outline-none"
                  placeholder="Ex: Plano Mensal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7C3AED] outline-none"
                    placeholder="97.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duração</label>
                  <select
                    value={['30', '90', '180', '365'].includes(formData.interval_days) ? formData.interval_days : 'custom'}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({
                        ...formData, 
                        interval_days: val === 'custom' ? '' : val
                      });
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7C3AED] outline-none [&>option]:bg-[#121212] [&>option]:text-white"
                  >
                    <option value="30">Mensal (30 dias)</option>
                    <option value="90">Trimestral (90 dias)</option>
                    <option value="180">Semestral (180 dias)</option>
                    <option value="365">Anual (365 dias)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
              </div>

              {!['30', '90', '180', '365'].includes(formData.interval_days) && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Dias Personalizados</label>
                  <input
                    type="number"
                    required
                    value={formData.interval_days}
                    onChange={e => setFormData({...formData, interval_days: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7C3AED] outline-none"
                    placeholder="Ex: 45"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição Curta</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7C3AED] outline-none"
                  placeholder="Ex: Ideal para começar"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Funcionalidades (uma por linha)</label>
                <textarea
                  rows={4}
                  value={formData.features}
                  onChange={e => setFormData({...formData, features: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7C3AED] outline-none resize-none"
                  placeholder="Acesso total&#10;Suporte 24h&#10;Backup diário"
                />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended}
                    onChange={e => setFormData({...formData, is_recommended: e.target.checked})}
                    className="rounded bg-white/10 border-white/20 text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  <span className="text-sm text-gray-300">Recomendado / Destaque</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded bg-white/10 border-white/20 text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  <span className="text-sm text-gray-300">Ativo</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#7C3AED] text-white font-bold hover:bg-[#6D28D9] transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
