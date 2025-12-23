import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { GlassCard } from '../components/GlassCard';
import { Save, CreditCard, DollarSign, Store, QrCode, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PaymentSettings() {
  const { establishment, refreshEstablishment } = useEstablishment();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    manual_pix_key: '',
    mp_access_token: '',
    mp_public_key: '',
    allow_pay_at_shop: true,
    payment_mode: 'checkout_transparent' as 'checkout_transparent' | 'redirect'
  });

  useEffect(() => {
    if (establishment) {
      setFormData({
        manual_pix_key: establishment.manual_pix_key || '',
        mp_access_token: establishment.mp_access_token || '',
        mp_public_key: establishment.mp_public_key || '',
        allow_pay_at_shop: establishment.allow_pay_at_shop ?? true,
        payment_mode: establishment.payment_mode || 'checkout_transparent'
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
          manual_pix_key: formData.manual_pix_key,
          mp_access_token: formData.mp_access_token,
          mp_public_key: formData.mp_public_key,
          allow_pay_at_shop: formData.allow_pay_at_shop,
          payment_mode: formData.payment_mode
        })
        .eq('id', establishment.id);

      if (error) throw error;

      await refreshEstablishment();
      toast.success('Configurações de pagamento salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold text-white mb-8">Meios de Pagamento</h1>
      <p className="text-gray-400 mb-8">Configure como seus clientes pagarão pelos agendamentos.</p>

      <div className="space-y-6">
        
        {/* Opções Gerais */}
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-[#2DD4BF]" /> Opções de Pagamento
          </h3>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <h4 className="font-bold text-white">Pagar na Barbearia</h4>
              <p className="text-sm text-gray-400">Permitir que o cliente agende sem pagar online e acerte no local.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.allow_pay_at_shop}
                onChange={e => setFormData({...formData, allow_pay_at_shop: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2DD4BF]"></div>
            </label>
          </div>
        </GlassCard>

        {/* PIX Manual */}
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#7C3AED]" /> Pix Manual (Sem Taxas)
          </h3>
          <p className="text-sm text-gray-400">
            Seu cliente verá esta chave Pix e enviará o comprovante pelo WhatsApp. Não há baixa automática.
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Sua Chave Pix (CPF, CNPJ, Email, Celular)</label>
            <input 
              type="text"
              value={formData.manual_pix_key}
              onChange={e => setFormData({...formData, manual_pix_key: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#7C3AED] outline-none"
              placeholder="Ex: 12.345.678/0001-90"
            />
          </div>
        </GlassCard>

        {/* Mercado Pago */}
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" /> Mercado Pago (Automático)
          </h3>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
             <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
             <p className="text-sm text-blue-200">
               Ao configurar o Mercado Pago, seus clientes poderão pagar via Pix ou Cartão e o agendamento será confirmado automaticamente.
             </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Access Token (Produção)</label>
              <input 
                type="password"
                value={formData.mp_access_token}
                onChange={e => setFormData({...formData, mp_access_token: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-gray-500 mt-1">Obtenha em: <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" className="text-blue-400 underline">Painel de Desenvolvedor do Mercado Pago</a></p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Public Key (Opcional)</label>
              <input 
                type="text"
                value={formData.mp_public_key}
                onChange={e => setFormData({...formData, mp_public_key: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
          </div>
        </GlassCard>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Configurações de Pagamento
        </button>

      </div>
    </div>
  );
}
