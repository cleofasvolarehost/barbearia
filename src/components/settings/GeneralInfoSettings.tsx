import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { GlassCard } from '../GlassCard';
import { Save, Clock, Phone, Store, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function GeneralInfoSettings() {
  const { establishment, refreshEstablishment } = useEstablishment();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    open_hour: '09:00',
    close_hour: '19:00',
    work_days: [1, 2, 3, 4, 5, 6] // Default Mon-Sat
  });

  useEffect(() => {
    if (establishment) {
      setFormData({
        name: establishment.name || '',
        slug: establishment.slug || '',
        phone: establishment.phone || '',
        open_hour: establishment.open_hour || '09:00',
        close_hour: establishment.close_hour || '19:00',
        work_days: establishment.work_days || [1, 2, 3, 4, 5, 6]
      });
    }
  }, [establishment]);

  const handleSave = async () => {
    if (!establishment) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          name: formData.name,
          slug: formData.slug,
          phone: formData.phone,
          open_hour: formData.open_hour,
          close_hour: formData.close_hour,
          work_days: formData.work_days
        })
        .eq('id', establishment.id);

      if (error) throw error;

      await refreshEstablishment();
      toast.success('Informações atualizadas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    const currentDays = formData.work_days;
    if (currentDays.includes(day)) {
      setFormData({ ...formData, work_days: currentDays.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, work_days: [...currentDays, day].sort() });
    }
  };

  const daysOfWeek = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' }
  ];

  return (
      <div className="space-y-6">
        
        {/* Informações Básicas */}
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-[#7C3AED]" /> Informações da Barbearia
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Link da Barbearia (Slug)</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <span className="text-gray-500 text-sm">{window.location.host}/</span>
                    <input 
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="flex-1 bg-transparent border-none text-white focus:ring-0 outline-none p-0 font-bold"
                    placeholder="minha-barbearia"
                    />
                </div>
                <button 
                    onClick={() => window.open(`${window.location.protocol}//${window.location.host}/${formData.slug}`, '_blank')}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                    title="Visualizar Barbearia"
                >
                    <ExternalLink className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Este é o link que seus clientes usarão para agendar.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Nome da Barbearia</label>
              <input 
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#7C3AED] outline-none"
                placeholder="Ex: Cortes do Zé"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Telefone / WhatsApp</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="flex-1 bg-transparent border-none text-white focus:ring-0 outline-none p-0"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Horários de Funcionamento */}
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2DD4BF]" /> Horários de Funcionamento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Horário de Abertura</label>
              <input 
                type="time"
                value={formData.open_hour}
                onChange={e => setFormData({...formData, open_hour: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#2DD4BF] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Horário de Fechamento</label>
              <input 
                type="time"
                value={formData.close_hour}
                onChange={e => setFormData({...formData, close_hour: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#2DD4BF] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-3">Dias de Funcionamento</label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all
                    ${formData.work_days.includes(day.id) 
                      ? 'bg-[#2DD4BF] text-[#121212]' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Configurações
        </button>
      </div>
  );
}
