import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { toast } from 'react-hot-toast';
import { CreditCard, Save, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';

interface GatewayConfig {
  key: string;
  name: string;
  field: string;
  placeholder: string;
  isActive: boolean;
  value: string;
}

export default function SuperAdminGateways() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGateway, setActiveGateway] = useState<string>('mercadopago');
  const [iuguAccountId, setIuguAccountId] = useState('');
  const [iuguToken, setIuguToken] = useState('');
  const [iuguFetching, setIuguFetching] = useState(false);
  
  const [gateways, setGateways] = useState<GatewayConfig[]>([
    { key: 'mercadopago', name: 'Mercado Pago', field: 'mp_access_token', placeholder: 'APP_USR-xxxx...', isActive: false, value: '' },
    { key: 'asaas', name: 'Asaas', field: 'asaas_api_key', placeholder: '$aact_...', isActive: false, value: '' },
    { key: 'efi', name: 'Efi (Gerencianet)', field: 'efi_credentials', placeholder: 'Client ID / Secret', isActive: false, value: '' },
  ]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchIugu();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_settings')
        .select('*');

      if (error) throw error;

      // Map DB settings to state
      const newGateways = gateways.map(g => {
        const setting = data?.find(s => s.setting_key === g.field);
        return { ...g, value: setting?.setting_value || '' };
      });

      const activeSetting = data?.find(s => s.setting_key === 'active_gateway');
      if (activeSetting) {
        setActiveGateway(activeSetting.setting_value);
      }

      setGateways(newGateways);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchIugu = async () => {
    try {
      setIuguFetching(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await apiFetch('/api/admin/gateways/iugu', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ct = res.headers.get('content-type') || '';
      const payload = ct.includes('application/json') ? await res.json() : { success: false, mensagem: await res.text() };
      if ((payload?.success || payload?.ok) && payload.data) {
        setIuguAccountId(payload.data.account_id || '');
        if (payload.data.is_active) setActiveGateway('iugu');
      }
      if (!res.ok) {
        toast.error(`Erro (${res.status}) ao carregar Iugu: ${payload.mensagem || 'verifique VITE_BACKEND_URL'}`);
      }
    } catch (e) {
      // noop
    } finally {
      setIuguFetching(false);
    }
  };

  const handleSave = async (gatewayKey: string) => {
    setSaving(true);
    const gateway = gateways.find(g => g.key === gatewayKey);
    if (!gateway) return;

    try {
      // 1. Save Credential
      const { error: credError } = await supabase
        .from('saas_settings')
        .upsert({ 
          setting_key: gateway.field,
          setting_value: gateway.value,
          is_active: true
        }, { onConflict: 'setting_key' });

      if (credError) throw credError;

      toast.success(`Credenciais de ${gateway.name} salvas!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (gatewayKey: string) => {
    try {
      const { error } = await supabase
        .from('saas_settings')
        .upsert({ 
          setting_key: 'active_gateway',
          setting_value: gatewayKey,
          is_active: true
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      // Backend toggle for system_gateways
      if (gatewayKey === 'iugu') {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const r = await apiFetch('/api/admin/gateways/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ provider: 'iugu' }),
          });
          if (!r.ok) {
            const t = await r.text();
            toast.error(`Falha ao ativar Iugu (${r.status}): ${t}`);
          }
        }
      }

      setActiveGateway(gatewayKey);
      toast.success(`Gateway ${gatewayKey.toUpperCase()} ativado!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao ativar gateway');
    }
  };

  const updateGatewayValue = (key: string, value: string) => {
    setGateways(prev => prev.map(g => g.key === key ? { ...g, value } : g));
  };

  if (loading) return <div className="p-8 text-center text-white">Carregando Gateways...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-[#10B981]" />
          Gateways de Pagamento (SaaS)
        </h1>
        <p className="text-gray-400">Gerencie por onde o SaaS recebe as assinaturas dos estabelecimentos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {gateways.map(gateway => {
          const isSelected = activeGateway === gateway.key;
          
          return (
            <GlassCard 
              key={gateway.key}
              className={`p-6 border-2 transition-all ${isSelected ? 'border-[#10B981] bg-[#10B981]/5' : 'border-transparent hover:border-white/10'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#10B981]/20' : 'bg-white/5'}`}>
                    <CreditCard className={`w-6 h-6 ${isSelected ? 'text-[#10B981]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{gateway.name}</h3>
                    <p className="text-xs text-gray-500 uppercase">{gateway.key}</p>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="px-2 py-1 bg-[#10B981] text-black text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> ATIVO
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    API Key / Token
                  </label>
                  <input
                    type="password"
                    value={gateway.value}
                    onChange={(e) => updateGatewayValue(gateway.key, e.target.value)}
                    placeholder={gateway.placeholder}
                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-[#10B981] outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave(gateway.key)}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar
                  </button>

                  {!isSelected && (
                    <button
                      onClick={() => handleActivate(gateway.key)}
                      className="flex-1 py-2 rounded-lg border border-[#10B981]/30 hover:bg-[#10B981]/10 text-[#10B981] text-sm font-semibold transition-colors"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Iugu */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3">
        <GlassCard 
          className={`p-6 border-2 transition-all ${activeGateway === 'iugu' ? 'border-[#10B981] bg-[#10B981]/5' : 'border-transparent hover:border-white/10'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeGateway === 'iugu' ? 'bg-[#10B981]/20' : 'bg-white/5'}`}>
                <CreditCard className={`w-6 h-6 ${activeGateway === 'iugu' ? 'text-[#10B981]' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-bold text-white">Iugu</h3>
                <p className="text-xs text-gray-500 uppercase">iugu</p>
              </div>
            </div>
            {activeGateway === 'iugu' && (
              <div className="px-2 py-1 bg-[#10B981] text-black text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> ATIVO
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account ID</label>
              <input
                type="text"
                value={iuguAccountId}
                onChange={(e) => setIuguAccountId(e.target.value)}
                placeholder="acc_..."
                className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-[#10B981] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Live API Token</label>
              <input
                type="password"
                value={iuguToken}
                onChange={(e) => setIuguToken(e.target.value)}
                placeholder="live_..."
                className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-[#10B981] outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  try {
                    setSaving(true);
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData.session?.access_token;
                    if (!token) throw new Error('Sem sessão');
                    const res = await apiFetch('/api/admin/gateways/iugu', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ account_id: iuguAccountId, api_token: iuguToken }),
                    });
                    const ct = res.headers.get('content-type') || '';
                    if (!ct.toLowerCase().includes('application/json')) {
                      throw new Error(`Resposta inesperada do backend (content-type: ${ct || 'desconhecido'}). Verifique VITE_BACKEND_URL`);
                    }
                    const payload = await res.json();
                    if (!res.ok || !(payload?.success || payload?.ok)) throw new Error(payload?.mensagem || `Erro (${res.status}) ao salvar Iugu`);
                    toast.success('Credenciais da Iugu salvas com segurança');
                  } catch (e) {
                    console.error(e);
                    toast.error(e instanceof Error ? e.message : 'Erro ao salvar Iugu');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || iuguFetching}
                className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Salvar
              </button>

              {activeGateway !== 'iugu' && (
                <button
                  onClick={() => handleActivate('iugu')}
                  className="flex-1 py-2 rounded-lg border border-[#10B981]/30 hover:bg-[#10B981]/10 text-[#10B981] text-sm font-semibold transition-colors"
                >
                  Ativar
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-yellow-500">Atenção Super Admin</h4>
          <p className="text-sm text-yellow-200/80">
            A troca do gateway ativo afeta imediatamente todas as novas tentativas de pagamento de assinatura.
            Certifique-se de que as credenciais estão válidas antes de ativar.
          </p>
        </div>
      </div>
    </div>
  );
}
