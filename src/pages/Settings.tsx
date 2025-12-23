import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { GlassCard } from '../components/GlassCard';
import { Upload, Save, Palette, Image as ImageIcon, Check, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { establishment, refreshEstablishment } = useEstablishment();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const [theme, setTheme] = useState({
    primary_color: '#7C3AED',
    secondary_color: '#2DD4BF',
    logo_url: '',
    banner_url: ''
  });

  useEffect(() => {
    if (establishment) {
      setTheme({
        primary_color: establishment.primary_color || '#7C3AED',
        secondary_color: establishment.secondary_color || '#2DD4BF',
        logo_url: establishment.logo_url || '',
        banner_url: establishment.banner_url || ''
      });
    }
  }, [establishment]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${establishment?.id}/${type}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      if (type === 'logo') setUploadingLogo(true);
      else setUploadingBanner(true);

      const { error: uploadError } = await supabase.storage
        .from('shop-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shop-assets')
        .getPublicUrl(filePath);

      setTheme(prev => ({ ...prev, [`${type}_url`]: publicUrl }));
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} enviado com sucesso!`);

    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!establishment) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          primary_color: theme.primary_color,
          secondary_color: theme.secondary_color,
          logo_url: theme.logo_url,
          banner_url: theme.banner_url
        })
        .eq('id', establishment.id);

      if (error) throw error;

      await refreshEstablishment();
      toast.success('Configurações salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold text-white mb-8">Personalização da Marca</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Controls */}
        <div className="space-y-6">
          
          {/* Colors */}
          <GlassCard className="p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#7C3AED]" /> Cores da Marca
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cor Primária</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={theme.primary_color}
                    onChange={e => setTheme({...theme, primary_color: e.target.value})}
                    className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 flex-shrink-0"
                  />
                  <input 
                    type="text"
                    value={theme.primary_color}
                    onChange={e => setTheme({...theme, primary_color: e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-white uppercase text-sm min-w-0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Botões e destaques</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Cor Secundária</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={theme.secondary_color}
                    onChange={e => setTheme({...theme, secondary_color: e.target.value})}
                    className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 flex-shrink-0"
                  />
                  <input 
                    type="text"
                    value={theme.secondary_color}
                    onChange={e => setTheme({...theme, secondary_color: e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-white uppercase text-sm min-w-0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Detalhes e preços</p>
              </div>
            </div>
          </GlassCard>

          {/* Assets */}
          <GlassCard className="p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#2DD4BF]" /> Imagens
            </h3>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Logo da Barbearia</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                  {theme.logo_url ? (
                    <img src={theme.logo_url} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-600" />
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Recomendado: 500x500px (PNG/JPG)</p>
                </div>
              </div>
            </div>

            {/* Banner Upload */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Banner de Fundo</label>
              <div className="w-full h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                {theme.banner_url ? (
                  <img src={theme.banner_url} className="w-full h-full object-cover opacity-50" alt="Banner" />
                ) : (
                  <span className="text-gray-600 text-sm">Sem banner</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                   <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm backdrop-blur transition-colors inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Alterar Banner
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'banner')} />
                  </label>
                </div>
                {uploadingBanner && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-100">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Recomendado: 1920x600px (Fica como fundo do cabeçalho)</p>
            </div>
          </GlassCard>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Alterações
          </button>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6 sticky top-6">
          <h3 className="text-xl font-bold text-white">Preview ao Vivo</h3>
          
          {/* Mockup of Booking Page */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#121212] shadow-2xl relative h-[600px]">
            {/* Header */}
            <div className="relative h-40 bg-gray-900">
               {theme.banner_url && <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${theme.banner_url})` }} />}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212]" />
               <div className="absolute bottom-4 left-4 flex items-end gap-3">
                  {theme.logo_url && <img src={theme.logo_url} className="w-12 h-12 rounded-lg border border-white/20 shadow-lg" />}
                  <div>
                    <h1 className="text-lg font-bold text-white">{establishment?.name || 'Sua Barbearia'}</h1>
                    <p className="text-xs text-gray-400">São Paulo, SP</p>
                  </div>
               </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
               <div className="h-1 w-full bg-white/5 rounded-full flex gap-1">
                  <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                  <div className="h-full w-1/3 rounded-full bg-white/5" />
                  <div className="h-full w-1/3 rounded-full bg-white/5" />
               </div>

               <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex justify-between items-center" style={{ borderColor: theme.primary_color, backgroundColor: `${theme.primary_color}10` }}>
                  <div>
                     <div className="h-4 w-24 bg-white/20 rounded mb-2" />
                     <div className="h-3 w-16 bg-white/10 rounded" />
                  </div>
                  <div className="font-bold" style={{ color: theme.secondary_color }}>R$ 50,00</div>
               </div>

               <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex justify-between items-center">
                  <div>
                     <div className="h-4 w-32 bg-white/20 rounded mb-2" />
                     <div className="h-3 w-20 bg-white/10 rounded" />
                  </div>
                  <div className="font-bold" style={{ color: theme.secondary_color }}>R$ 35,00</div>
               </div>

               {/* Mock Button */}
               <div className="absolute bottom-4 left-4 right-4">
                  <div className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: theme.primary_color }}>
                     Confirmar <Check className="w-4 h-4" />
                  </div>
               </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500">Visualização aproximada da página de agendamento</p>
        </div>

      </div>
    </div>
  );
}
