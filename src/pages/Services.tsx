import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Service } from '../types/database';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/GlassCard';
import { Scissors, Clock, DollarSign, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  useEffect(() => {
    let mounted = true;

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Services: Data fetch timed out');
        setLoading(false);
      }
    }, 5000);

    async function fetchServices() {
      try {
        const { data, error } = await supabase
          .from('servicos')
          .select('*')
          .eq('ativo', true)
          .order('categoria');
        
        if (!mounted) return;

        if (error) {
            console.error('Supabase Error:', error);
            // Don't throw, just log
        }
        setServices(data || []);
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
      } finally {
        if (mounted) {
            setLoading(false);
            clearTimeout(timeoutId);
        }
      }
    }

    fetchServices();

    return () => {
        mounted = false;
        clearTimeout(timeoutId);
    };
  }, []);

  const categories = ['Todos', ...Array.from(new Set(services.map(s => s.categoria).filter(Boolean)))];

  const filteredServices = selectedCategory === 'Todos'
    ? services
    : services.filter(s => s.categoria === selectedCategory);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7C3AED]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] py-12 sm:py-24 min-h-screen">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl relative inline-block">
            <span className="relative z-10">Nossos Serviços</span>
            <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-[#7C3AED] rounded-full"></div>
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-400">
            Confira nossa lista completa de serviços e escolha o melhor para você.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mt-10 flex flex-wrap gap-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as string)}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all border ${
                selectedCategory === category
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-[#7C3AED] hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-8 border-t border-white/10 pt-10 sm:mt-16 sm:pt-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {filteredServices.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <GlassCard hover className="h-full flex flex-col p-6">
                <div className="flex items-center justify-between gap-x-4 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30">
                    {service.categoria}
                  </span>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duracao_minutos} min
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#2DD4BF] transition-colors">
                  {service.nome}
                </h3>
                
                <p className="text-sm text-gray-400 flex-grow mb-6 line-clamp-3">
                  {service.descricao}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                  <div className="text-2xl font-bold text-white flex items-center">
                    <span className="text-sm text-gray-500 mr-1">R$</span>
                    {service.preco.toFixed(2).replace('.', ',')}
                  </div>
                  <Link
                    to={`/agendamento?service=${service.id}`}
                    className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white hover:bg-[#6D28D9] transition-all flex items-center shadow-lg shadow-[#7C3AED]/20"
                  >
                    Agendar
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
