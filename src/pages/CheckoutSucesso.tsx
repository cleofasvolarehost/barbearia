import { useNavigate, useLocation } from 'react-router-dom';
import { GlassCard } from '../components/GlassCard';
import { CheckCircle, CreditCard, Calendar, ArrowRight, Home } from 'lucide-react';

export default function CheckoutSucesso() {
  const navigate = useNavigate();
  const location = useLocation();
  const assinaturaId = location.state?.assinaturaId;

  const calcularProximaCobranca = () => {
    const data = new Date();
    data.setMonth(data.getMonth() + 1);
    return data.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-2xl">
        <GlassCard className="p-8 text-center">
          {/* Ícone de Sucesso */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Parabéns! Assinatura Criada
            </h1>
            <p className="text-gray-300">
              Sua assinatura premium foi ativada com sucesso
            </p>
          </div>

          {/* Detalhes da Assinatura */}
          <div className="space-y-4 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-yellow-500 mr-3" />
                <span className="text-gray-300">ID da Assinatura:</span>
              </div>
              <span className="text-white font-mono text-sm">
                {assinaturaId ? assinaturaId.substring(0, 8) + '...' : 'N/A'}
              </span>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-yellow-500 mr-3" />
                <span className="text-gray-300">Próxima Cobrança:</span>
              </div>
              <span className="text-white font-medium">
                {calcularProximaCobranca()}
              </span>
            </div>
          </div>

          {/* Benefícios */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Você agora tem acesso a:
            </h3>
            <div className="space-y-2 text-left">
              <div className="flex items-center text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                <span>Agendamento ilimitado de clientes</span>
              </div>
              <div className="flex items-center text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                <span>Relatórios avançados e analytics</span>
              </div>
              <div className="flex items-center text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                <span>Suporte prioritário 24/7</span>
              </div>
              <div className="flex items-center text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                <span>Notificações push para novos agendamentos</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-3 px-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 flex items-center justify-center"
            >
              <Home className="w-5 h-5 mr-2" />
              Ir para Dashboard
            </button>

            <button
              onClick={() => navigate('/planos')}
              className="w-full bg-gray-700 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Ver outros planos
            </button>
          </div>

          {/* Informação de Segurança */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Você receberá um email de confirmação com os detalhes da sua assinatura.
              <br />
              Sua assinatura pode ser cancelada a qualquer momento através do painel de controle.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}