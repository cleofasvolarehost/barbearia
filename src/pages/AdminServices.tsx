import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { useAuth } from '../hooks/useAuth';
import { GlassCard } from '../components/GlassCard';
import { Plus, Edit, Trash2, Wand2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Service } from '../types/database';

export default function AdminServices() {
  const { establishment, loading: establishmentLoading } = useEstablishment();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao_minutos: '30',
    categoria: 'Cabelo'
  });

  const [categories, setCategories] = useState<string[]>(['Cabelo', 'Barba', 'Combo', 'Química', 'Acabamento', 'Outros']);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchServices = async () => {
    if (!establishment) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('categoria');

      if (error) throw error;
      setServices(data || []);
      
      // Update categories from establishment if available
      if (establishment.service_categories) {
          setCategories(establishment.service_categories);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (establishment) {
        fetchServices();
    } else if (!establishmentLoading) {
        setLoading(false);
    }
  }, [establishment, establishmentLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishment || !user) return;

    try {
      const payload = {
        establishment_id: establishment.id,
        owner_id: user?.id,
        nome: formData.nome,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        duracao_minutos: parseInt(formData.duracao_minutos),
        categoria: formData.categoria,
        ativo: true
      };

      if (editingService) {
        const { error } = await supabase
          .from('servicos')
          .update(payload)
          .eq('id', editingService.id);
        if (error) throw error;
        toast.success('Serviço atualizado!');
      } else {
        const { error } = await supabase
          .from('servicos')
          .insert(payload);
        if (error) throw error;
        toast.success('Serviço criado!');
      }

      setIsModalOpen(false);
      setEditingService(null);
      setFormData({ nome: '', descricao: '', preco: '', duracao_minutos: '30', categoria: 'Cabelo' });
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Erro ao salvar serviço.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Serviço excluído.');
      fetchServices();
    } catch (error) {
      toast.error('Erro ao excluir.');
    }
  };

  const handleAutoFill = async () => {
    if (!establishment || !user) return;
    const standardServices = [
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Corte de Cabelo (Social/Degradê)', preco: 40, duracao_minutos: 30, categoria: 'Cabelo', descricao: 'Corte tradicional ou degradê moderno.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Barba (Modelada)', preco: 30, duracao_minutos: 30, categoria: 'Barba', descricao: 'Barba modelada com toalha quente e navalha.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Sobrancelha', preco: 15, duracao_minutos: 10, categoria: 'Acabamento', descricao: 'Design de sobrancelha na navalha.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Pezinho (Acabamento)', preco: 15, duracao_minutos: 10, categoria: 'Acabamento', descricao: 'Acabamento do corte e contorno.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Combo: Cabelo + Barba', preco: 60, duracao_minutos: 50, categoria: 'Combo', descricao: 'Serviço completo de cabelo e barba.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Combo: Cabelo + Barba + Sobrancelha', preco: 70, duracao_minutos: 60, categoria: 'Combo', descricao: 'Pacote completo para o visual perfeito.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Pintura / Pigmentação', preco: 35, duracao_minutos: 45, categoria: 'Química', descricao: 'Pigmentação para realçar contornos ou esconder falhas.' },
      { establishment_id: establishment.id, owner_id: user.id, nome: 'Selagem / Relaxamento', preco: 80, duracao_minutos: 60, categoria: 'Química', descricao: 'Alisamento ou relaxamento capilar.' },
    ];

    try {
      const { error } = await supabase.from('servicos').insert(standardServices);
      if (error) throw error;
      toast.success('Serviços padrão adicionados!');
      fetchServices();
    } catch (error) {
      toast.error('Erro ao adicionar serviços padrão.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
        toast.error('Categoria já existe!');
        return;
    }

    const updatedCategories = [...categories, newCategoryName.trim()];
    
    try {
        const { error } = await supabase
            .from('establishments')
            .update({ service_categories: updatedCategories })
            .eq('id', establishment?.id);

        if (error) throw error;
        
        setCategories(updatedCategories);
        setFormData({ ...formData, categoria: newCategoryName.trim() });
        setIsAddingCategory(false);
        setNewCategoryName('');
        toast.success('Categoria adicionada!');
        
        // Refresh establishment context if possible, or just local state is enough for now
    } catch (error) {
        toast.error('Erro ao salvar categoria');
    }
  };

  const handleDeleteCategory = async () => {
    const categoryToDelete = formData.categoria;
    if (!categoryToDelete) return;
    
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoryToDelete}"?`)) return;

    const updatedCategories = categories.filter(c => c !== categoryToDelete);
    
    try {
        const { error } = await supabase
            .from('establishments')
            .update({ service_categories: updatedCategories })
            .eq('id', establishment?.id);

        if (error) throw error;
        
        setCategories(updatedCategories);
        // Reset selection to first available or default
        const newSelected = updatedCategories.length > 0 ? updatedCategories[0] : '';
        setFormData({ ...formData, categoria: newSelected });
        toast.success('Categoria excluída!');
    } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Erro ao excluir categoria');
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        nome: service.nome,
        descricao: service.descricao || '',
        preco: service.preco.toString(),
        duracao_minutos: service.duracao_minutos.toString(),
        categoria: service.categoria || 'Cabelo'
      });
    } else {
      setEditingService(null);
      setFormData({ nome: '', descricao: '', preco: '', duracao_minutos: '30', categoria: 'Cabelo' });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-white">Carregando serviços...</div>;

  return (
    <div className="p-4 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Serviços</h1>
        <button
          onClick={() => openModal()}
          className="w-full sm:w-auto bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold shadow-lg"
        >
          <Plus className="w-5 h-5" /> Novo Serviço
        </button>
      </div>

      {services.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-white/5 p-4 rounded-full mb-4">
            <Wand2 className="w-12 h-12 text-[#7C3AED]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Nenhum serviço cadastrado</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Comece do zero ou use nossa lista padrão para economizar tempo.
          </p>
          <button
            onClick={handleAutoFill}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl flex items-center gap-2 transition-all font-bold"
          >
            <Wand2 className="w-5 h-5" /> Preencher Automaticamente
          </button>
          <p className="text-xs text-gray-500 mt-4">ID da Loja: {establishment?.id}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <GlassCard key={service.id} className="p-6 group relative hover:border-[#7C3AED]/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30 uppercase">
                  {service.categoria}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(service)} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(service.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{service.nome}</h3>
              <p className="text-gray-400 text-sm mb-4 h-10 line-clamp-2">{service.descricao}</p>
              <div className="flex justify-between items-center border-t border-white/10 pt-4">
                <span className="text-gray-400 text-sm">{service.duracao_minutos} min</span>
                <span className="text-2xl font-bold text-white">R$ {service.preco}</span>
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
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                <input
                  required
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={e => setFormData({...formData, preco: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Duração (min)</label>
                  <input
                    required
                    type="number"
                    value={formData.duracao_minutos}
                    onChange={e => setFormData({...formData, duracao_minutos: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Categoria</label>
                {isAddingCategory ? (
                    <div className="flex gap-2">
                        <input 
                            autoFocus
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="Nome da nova categoria"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED]"
                        />
                        <button 
                            type="button"
                            onClick={handleAddCategory}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3 py-2 rounded-xl font-bold transition-colors"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsAddingCategory(false)}
                            className="bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl font-bold transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <select
                        value={formData.categoria}
                        onChange={e => setFormData({...formData, categoria: e.target.value})}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED] [&>option]:bg-[#121212]"
                        >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        </select>
                        <button 
                            type="button"
                            onClick={handleDeleteCategory}
                            title="Excluir Categoria"
                            className="bg-white/5 hover:bg-red-500/20 text-white hover:text-red-500 px-3 py-2 rounded-xl font-bold transition-colors border border-white/10"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsAddingCategory(true)}
                            title="Nova Categoria"
                            className="bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl font-bold transition-colors border border-white/10"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#7C3AED] h-24 resize-none"
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
