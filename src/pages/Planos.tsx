import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/GlassCard';
import { toast } from 'react-hot-toast';
import { CreditCard, Check, Crown, Star, ArrowRight } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  intervalo: string;
  beneficios: string[];
  ativo: boolean;
}

export default function Planos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('ativo', true)
        .order('preco', { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleAssinar = (planoId: string) => {
    navigate(`/checkout/${planoId}`);
  };

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Crown className="w-12 h-12 text-yellow-500 mr-3" />
            <h1 className="text-5xl font-bold text-white">Planos Premium</h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Escolha o plano perfeito para levar sua barbearia ao próximo nível
          </p>
        </div>

        {/* Planos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {planos.map((plano, index) => {
            const isMaisPopular = index === 1; // Segundo plano é o mais popular
            const isAnual = plano.intervalo === 'yearly';
            
            return (
              <GlassCard
                key={plano.id}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                  isMaisPopular ? 'ring-4 ring-yellow-500 shadow-2xl shadow-yellow-500/20' : 'ring-1 ring-white/10'
                }`}
              >
                {/* Badge Mais Popular */}
                {isMaisPopular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 rounded-bl-lg font-bold text-sm">
                    <Star className="w-4 h-4 inline mr-1" />
                    MAIS POPULAR
                  </div>
                )}

                {/* Header do Plano */}
                <div className="text-center mb-8 pt-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plano.nome}</h3>
                  <p className="text-gray-400 mb-6">{plano.descricao}</p>
                  
                  {/* Preço */}
                  <div className="mb-6">
                    <div className="text-4xl font-bold text-white mb-2">
                      {formatarPreco(plano.preco)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {isAnual ? '/ano' : '/mês'}
                    </div>
                    {isAnual && (
                      <div className="text-yellow-500 text-sm font-semibold mt-2">
                        Economia de 2 meses!
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefícios */}
                <div className="mb-8">
                  <h4 className="text-white font-semibold mb-4">Benefícios:</h4>
                  <ul className="space-y-3">
                    {plano.beneficios.map((beneficio, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{beneficio}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botão */}
                <button
                  onClick={() => handleAssinar(plano.id)}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center ${
                    isMaisPopular
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700'
                      : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Assinar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </GlassCard>
            );
          })}
        </div>

        {/* Informações de Segurança */}
        <div className="mt-16 text-center">
          <GlassCard className="max-w-2xl mx-auto p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Pagamento Seguro</h3>
            <p className="text-gray-300">
              Utilizamos Iugu para processamento de pagamentos com tokenização de cartão. 
              Seus dados estão protegidos com os mais altos padrões de segurança.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}