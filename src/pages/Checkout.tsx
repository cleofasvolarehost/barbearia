import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import { toast } from 'react-hot-toast';
import { CreditCard, Lock, User, Calendar, Shield, ArrowLeft, Loader2 } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  intervalo: string;
}

export default function Checkout() {
  const { planoId } = useParams<{ planoId: string }>();
  const navigate = useNavigate();
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [iuguCarregado, setIuguCarregado] = useState(false);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    numeroCartao: '',
    nomeCartao: '',
    validade: '',
    cvv: ''
  });

  // Carregar Iugu.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.iugu.com/v2.js';
    script.async = true;
    script.onload = () => {
      setIuguCarregado(true);
      // Configurar Iugu (será configurado com o account_id do sistema)
      if (window.Iugu) {
        window.Iugu.setTestMode(true); // Em produção, usar false
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Buscar plano
  useEffect(() => {
    if (planoId) {
      fetchPlano();
    }
  }, [planoId]);

  const fetchPlano = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planoId)
        .single();

      if (error) throw error;
      setPlano(data);
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      toast.error('Erro ao carregar plano');
      navigate('/planos');
    } finally {
      setLoading(false);
    }
  };

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  const formatarNumeroCartao = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatarValidade = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'numeroCartao') {
      value = formatarNumeroCartao(value);
    } else if (field === 'validade') {
      value = formatarValidade(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validarFormulario = () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Email válido é obrigatório');
      return false;
    }
    if (!formData.numeroCartao.trim() || formData.numeroCartao.length < 19) {
      toast.error('Número do cartão inválido');
      return false;
    }
    if (!formData.nomeCartao.trim()) {
      toast.error('Nome no cartão é obrigatório');
      return false;
    }
    if (!formData.validade.trim() || formData.validade.length < 5) {
      toast.error('Validade inválida');
      return false;
    }
    if (!formData.cvv.trim() || formData.cvv.length < 3) {
      toast.error('CVV inválido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;
    if (!iuguCarregado || !window.Iugu) {
      toast.error('Sistema de pagamento não carregado');
      return;
    }
    if (!plano) return;

    setProcessando(true);

    try {
      // Obter account_id do sistema
      const { data: gatewayData } = await supabase
        .from('system_gateways')
        .select('account_id')
        .eq('provider', 'iugu')
        .eq('is_active', true)
        .single();

      if (!gatewayData?.account_id) {
        throw new Error('Gateway Iugu não configurado');
      }

      // Configurar Iugu com o account_id
      window.Iugu.setAccountID(gatewayData.account_id);

      // Tokenizar cartão
      const token = await window.Iugu.createPaymentToken({
        account_id: gatewayData.account_id,
        method: 'credit_card',
        test: true, // Em produção, usar false
        data: {
          number: formData.numeroCartao.replace(/\s/g, ''),
          verification_value: formData.cvv,
          first_name: formData.nomeCartao.split(' ')[0] || '',
          last_name: formData.nomeCartao.split(' ').slice(1).join(' ') || '',
          month: formData.validade.split('/')[0],
          year: formData.validade.split('/')[1]
        }
      });

      if (!token.id) {
        throw new Error('Erro ao tokenizar cartão');
      }

      // Obter usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Criar assinatura via backend
      const response = await apiFetch('/api/assinaturas/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          payment_token: token.id,
          plano_id: plano.id,
          barbeiro_id: user.id,
          email: formData.email,
          nome: formData.nome
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.mensagem || 'Erro ao criar assinatura');
      }

      toast.success('Assinatura criada com sucesso!');
      navigate('/checkout/sucesso', { state: { assinaturaId: result.assinatura_id } });
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar pagamento');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!plano) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/planos')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar para Planos
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Formulário de Pagamento */}
          <GlassCard className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Dados de Pagamento</h2>
              <p className="text-gray-400">Preencha os dados do seu cartão de crédito</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                  placeholder="João Silva"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                  placeholder="joao@email.com"
                  required
                />
              </div>

              {/* Dados do Cartão */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Número do Cartão
                </label>
                <input
                  type="text"
                  value={formData.numeroCartao}
                  onChange={(e) => handleInputChange('numeroCartao', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Nome no Cartão
                </label>
                <input
                  type="text"
                  value={formData.nomeCartao}
                  onChange={(e) => handleInputChange('nomeCartao', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                  placeholder="JOÃO SILVA"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Validade
                  </label>
                  <input
                    type="text"
                    value={formData.validade}
                    onChange={(e) => handleInputChange('validade', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                    placeholder="MM/AA"
                    maxLength={5}
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={formData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              {/* Segurança */}
              <div className="flex items-center text-gray-400 text-sm">
                <Shield className="w-4 h-4 mr-2 text-green-500" />
                Seus dados estão protegidos com criptografia de ponta a ponta
              </div>

              {/* Botão Submit */}
              <button
                type="submit"
                disabled={processando || !iuguCarregado}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-4 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processando ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Finalizar Assinatura
                  </>
                )}
              </button>
            </form>
          </GlassCard>

          {/* Resumo do Pedido */}
          <GlassCard className="p-8 h-fit">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Resumo do Pedido</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Plano:</span>
                <span className="text-white font-medium">{plano.nome}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Descrição:</span>
                <span className="text-white text-sm text-right">{plano.descricao}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Intervalo:</span>
                <span className="text-white font-medium">
                  {plano.intervalo === 'yearly' ? 'Anual' : 'Mensal'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-300">Total:</span>
                <span className="text-2xl font-bold text-yellow-500">
                  {formatarPreco(plano.preco)}
                </span>
              </div>

              {plano.intervalo === 'yearly' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-500 text-sm font-medium">
                    🎉 Economia de 2 meses no plano anual!
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
