import { useState, useEffect } from 'react';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/GlassCard';
import { Upload, Palette, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminBranding() {
    const { establishment, loading: establishmentLoading } = useEstablishment();
    const [primaryColor, setPrimaryColor] = useState('#7C3AED');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (establishment) {
            setPrimaryColor(establishment.primary_color || '#7C3AED');
            setLogoUrl(establishment.logo_url || '');
            setBannerUrl(establishment.banner_url || '');
        }
    }, [establishment]);

    const handleUpload = async (file: File, type: 'logo' | 'banner') => {
        if (!establishment) return;
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${establishment.id}/${type}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('shop-assets')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('shop-assets')
                .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;

            // Update local state
            if (type === 'logo') setLogoUrl(publicUrl);
            else setBannerUrl(publicUrl);

            // Update database
            const updatePayload = type === 'logo' ? { logo_url: publicUrl } : { banner_url: publicUrl };
            const { error: dbError } = await supabase
                .from('establishments')
                .update(updatePayload)
                .eq('id', establishment.id);

            if (dbError) throw dbError;

            toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} atualizado!`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Erro ao fazer upload.');
        } finally {
            setUploading(false);
        }
    };

    const handleColorSave = async () => {
        if (!establishment) return;
        try {
            const { error } = await supabase
                .from('establishments')
                .update({ primary_color: primaryColor })
                .eq('id', establishment.id);

            if (error) throw error;
            toast.success('Cor principal atualizada!');
        } catch (error) {
            toast.error('Erro ao salvar cor.');
        }
    };

    if (establishmentLoading) return <div className="text-white p-8">Carregando...</div>;

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Palette className="w-8 h-8 text-[#7C3AED]" /> Personalização da Marca
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Upload */}
                <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gray-400" /> Logo da Barbearia
                    </h3>
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden bg-black/20 relative group">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-500 text-xs text-center px-2">Sem Logo</span>
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="w-6 h-6 text-white" />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">Recomendado: 500x500px (PNG/JPG)</p>
                    </div>
                </GlassCard>

                {/* Banner Upload */}
                <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gray-400" /> Banner da Página
                    </h3>
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden bg-black/20 relative group">
                            {bannerUrl ? (
                                <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-500 text-xs text-center px-2">Sem Banner</span>
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="w-6 h-6 text-white" />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'banner')}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">Recomendado: 1200x400px (PNG/JPG)</p>
                    </div>
                </GlassCard>

                {/* Color Picker */}
                <GlassCard className="p-6 md:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Palette className="w-5 h-5 text-gray-400" /> Cor Principal
                    </h3>
                    <div className="flex items-center gap-4">
                        <input 
                            type="color" 
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-16 h-16 rounded-xl cursor-pointer border-none bg-transparent"
                        />
                        <div className="flex-1">
                            <p className="text-white font-mono">{primaryColor}</p>
                            <p className="text-sm text-gray-400">Esta cor será usada em botões, destaques e ícones na sua página de agendamento.</p>
                        </div>
                        <button 
                            onClick={handleColorSave}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                            <Check className="w-5 h-5" /> Salvar Cor
                        </button>
                    </div>
                </GlassCard>

                {/* Preview Link */}
                <div className="md:col-span-2 text-center">
                    <p className="text-gray-400 mb-2">Veja como está ficando sua página:</p>
                    <a 
                        href={`/agendar/${establishment?.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[#7C3AED] hover:text-[#6D28D9] underline font-bold"
                    >
                        Ver Página de Agendamento
                    </a>
                </div>
            </div>
        </div>
    );
}
