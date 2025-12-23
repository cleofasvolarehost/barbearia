import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { GlassCard } from '../components/GlassCard';
import { useEstablishment } from '../contexts/EstablishmentContext';

export default function AdminSetup() {
  const { user } = useAuth();
  const { establishment, refreshEstablishment } = useEstablishment();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  // Redirect if already has establishment
  useEffect(() => {
    if (establishment) {
        navigate('/admin/dashboard', { replace: true });
    }
  }, [establishment, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for Dev Mode
    const isDevMode = localStorage.getItem('trae_dev_mode') === 'true';
    if (isDevMode) {
        toast.error('Modo Dev: Não é possível criar barbearia sem um usuário real. Por favor, crie uma conta em /cadastro.');
        return;
    }

    if (!user) {
        toast.error('Você precisa estar logado para continuar.');
        return;
    }
    
    setLoading(true);

    try {
       // Check slug uniqueness client-side for faster feedback
       if (!/^[a-z0-9-]+$/.test(formData.slug)) {
          toast.error('Slug inválido. Use apenas letras minúsculas, números e hifens.');
          setLoading(false);
          return;
       }

       // Double check if user already has one (edge case)
       const { data: existing } = await supabase
         .from('establishments')
         .select('id')
         .eq('owner_id', user.id)
         .single();

       if (existing) {
           toast.success('Você já possui uma barbearia!');
           await refreshEstablishment();
           navigate('/admin/dashboard');
           return;
       }

       /*
       // Old direct insert method - replaced by RPC for atomic promotion
       const { error } = await supabase.from('establishments').insert({
         owner_id: user.id,
         name: formData.name,
         slug: formData.slug,
         open_hour: '09:00',
         close_hour: '19:00',
         work_days: [1,2,3,4,5,6]
       });
       */

       // Call the RPC function to create establishment AND promote user to 'dono'
       const { error } = await supabase.rpc('create_establishment_and_promote', {
         p_name: formData.name,
         p_slug: formData.slug
       });

       if (error) {
         // Check if it is a constraint violation for unique slug
         // RPC errors might wrap the DB error, need to check structure
         if (error.code === '23505' || error.message?.includes('duplicate key')) {
            throw { code: '23505' }; // Re-throw to catch block
         }
         throw error;
       }

       toast.success('Barbearia criada com sucesso!');
       
       // Force a refresh of the context
       await refreshEstablishment();
       
       // Small delay to ensure context updates before navigation
       setTimeout(() => {
           // Force page reload to ensure Auth Context picks up the new Role ('dono')
           // navigate('/admin/dashboard'); 
           window.location.href = '/admin/dashboard';
       }, 500);

    } catch (error: any) {
      console.error('Setup error:', error);
      if (error.code === '23505') {
        toast.error('Este link personalizado (slug) já está em uso.');
      } else {
        toast.error(`Erro ao configurar: ${error.message || 'Tente novamente.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full p-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Configuração Inicial</h1>
        <p className="text-gray-400 mb-8 text-center">Vamos configurar sua barbearia para começar.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Barbearia</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#7C3AED] outline-none"
              placeholder="Ex: Cortes do Zé"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Link Personalizado</label>
            <div className="flex">
               <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/10 bg-white/5 text-gray-500 sm:text-sm">
                  /
               </span>
               <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-r-xl bg-white/5 border border-white/10 text-white focus:border-[#7C3AED] outline-none"
                placeholder="minha-barbearia"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">Seus clientes usarão este link para agendar.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Começar'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
