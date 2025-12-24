const { supabase } = require('../config/supabase');
const { SYSTEM_GATEWAY_ENCRYPTION_KEY } = require('../config/env');

const ensureSuperAdmin = async (user) => {
  const { data } = await supabase
    .from('usuarios')
    .select('tipo')
    .eq('id', user.id)
    .single();
  return data?.tipo === 'super_admin';
};

module.exports = {
  async saveIugu(req, res) {
    try {
      const { account_id, api_token } = req.body;
      if (!account_id || !api_token) {
        return res.status(400).json({ success: false, mensagem: 'Campos obrigatórios: account_id, api_token' });
      }
      if (!(await ensureSuperAdmin(req.user))) {
        return res.status(403).json({ success: false, mensagem: 'Permissão negada' });
      }
      if (!SYSTEM_GATEWAY_ENCRYPTION_KEY) {
        return res.status(500).json({ success: false, mensagem: 'Chave de criptografia não configurada' });
      }

      const { data, error } = await supabase.rpc('upsert_system_gateway', {
        p_provider: 'iugu',
        p_account_id: account_id,
        p_api_token_plain: api_token,
        p_secret_key: SYSTEM_GATEWAY_ENCRYPTION_KEY,
      });
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (err) {
      console.error('saveIugu error', err);
      return res.status(500).json({ success: false, mensagem: 'Falha ao salvar credenciais do Iugu' });
    }
  },

  async getIugu(req, res) {
    try {
      if (!(await ensureSuperAdmin(req.user))) {
        return res.status(403).json({ success: false, mensagem: 'Permissão negada' });
      }
      const { data, error } = await supabase
        .from('system_gateways')
        .select('provider, account_id, is_active')
        .eq('provider', 'iugu')
        .maybeSingle();
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (err) {
      console.error('getIugu error', err);
      return res.status(500).json({ success: false, mensagem: 'Falha ao obter credenciais do Iugu' });
    }
  },

  async activateProvider(req, res) {
    try {
      const { provider } = req.body;
      if (!provider) return res.status(400).json({ success: false, mensagem: 'Provider é obrigatório' });
      if (!(await ensureSuperAdmin(req.user))) {
        return res.status(403).json({ success: false, mensagem: 'Permissão negada' });
      }

      // Desativar todos e ativar o selecionado
      const { error: e1 } = await supabase.from('system_gateways').update({ is_active: false }).neq('provider', provider);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('system_gateways')
        .upsert({ provider, is_active: true }, { onConflict: 'provider' });
      if (e2) throw e2;
      return res.json({ success: true });
    } catch (err) {
      console.error('activateProvider error', err);
      return res.status(500).json({ success: false, mensagem: 'Falha ao ativar provider' });
    }
  },
};
