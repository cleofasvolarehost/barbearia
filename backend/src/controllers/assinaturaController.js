const IuguService = require('../services/IuguService');
const { supabase } = require('../config/supabase');

class AssinaturaController {
  async criarAssinatura(req, res) {
    try {
      const { payment_token, plano_id, barbeiro_id, email, nome } = req.body;

      // Validações
      if (!payment_token || !plano_id || !barbeiro_id || !email || !nome) {
        return res.status(400).json({
          success: false,
          mensagem: 'Todos os campos são obrigatórios'
        });
      }

      // Buscar plano no banco de dados
      const { data: plano, error: planoError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', plano_id)
        .single();

      if (planoError || !plano) {
        return res.status(404).json({
          success: false,
          mensagem: 'Plano não encontrado'
        });
      }

      // Verificar se usuário já tem assinatura ativa
      const { data: assinaturaExistente } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', barbeiro_id)
        .eq('status', 'active')
        .single();

      if (assinaturaExistente) {
        return res.status(400).json({
          success: false,
          mensagem: 'Usuário já possui uma assinatura ativa'
        });
      }

      // Criar serviço Iugu
      const iuguService = new IuguService();

      // Criar cliente no Iugu
      const clienteIugu = await iuguService.createCustomer(email, nome);
      
      if (!clienteIugu.id) {
        throw new Error('Erro ao criar cliente no Iugu');
      }

      // Criar assinatura no Iugu
      const assinaturaIugu = await iuguService.createSubscription(
        clienteIugu.id,
        plano.id // Usar o ID do plano como plan_identifier
      );

      if (!assinaturaIugu.id) {
        throw new Error('Erro ao criar assinatura no Iugu');
      }

      // Calcular próximo ciclo
      const dataProximoCiclo = new Date();
      if (plano.intervalo === 'monthly') {
        dataProximoCiclo.setMonth(dataProximoCiclo.getMonth() + 1);
      } else if (plano.intervalo === 'yearly') {
        dataProximoCiclo.setFullYear(dataProximoCiclo.getFullYear() + 1);
      }

      // Criar registro de assinatura no banco de dados
      const { data: novaAssinatura, error: assinaturaError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: barbeiro_id,
          plano_id: plano_id,
          iugu_subscription_id: assinaturaIugu.id,
          iugu_customer_id: clienteIugu.id,
          status: 'active',
          data_inicio: new Date().toISOString(),
          data_proximo_ciclo: dataProximoCiclo.toISOString()
        })
        .select()
        .single();

      if (assinaturaError) {
        throw new Error('Erro ao salvar assinatura no banco de dados');
      }

      res.json({
        success: true,
        assinatura_id: assinaturaIugu.id,
        mensagem: 'Assinatura criada com sucesso!'
      });

    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      res.status(500).json({
        success: false,
        mensagem: error.message || 'Erro ao processar assinatura'
      });
    }
  }

  async cancelarAssinatura(req, res) {
    try {
      const { assinaturaId } = req.params;
      const userId = req.user.id;

      // Verificar se a assinatura pertence ao usuário
      const { data: assinatura } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('iugu_subscription_id', assinaturaId)
        .eq('user_id', userId)
        .single();

      if (!assinatura) {
        return res.status(404).json({
          success: false,
          mensagem: 'Assinatura não encontrada'
        });
      }

      // Cancelar no Iugu
      const iuguService = new IuguService();
      await iuguService.deleteSubscription(assinaturaId);

      // Atualizar status no banco de dados
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('iugu_subscription_id', assinaturaId);

      res.json({
        success: true,
        mensagem: 'Assinatura cancelada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({
        success: false,
        mensagem: error.message || 'Erro ao cancelar assinatura'
      });
    }
  }

  async listarAssinaturas(req, res) {
    try {
      const userId = req.user.id;

      const { data: assinaturas, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (
            id,
            nome,
            descricao,
            preco,
            intervalo
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        assinaturas: assinaturas || []
      });

    } catch (error) {
      console.error('Erro ao listar assinaturas:', error);
      res.status(500).json({
        success: false,
        mensagem: 'Erro ao listar assinaturas'
      });
    }
  }
}

module.exports = AssinaturaController;