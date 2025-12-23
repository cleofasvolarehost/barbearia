import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Instagram, Phone, ArrowRight, User, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { supabase } from '../lib/supabase';
import { Establishment } from '../types/database';

export default function Home() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If slug is missing (which shouldn't happen due to router, but safety check)
    if (!slug) {
        setLoading(false);
        return;
    }

    const fetchEstablishment = async () => {
      try {
        const { data, error } = await supabase
          .from('establishments')
          .select('*')
          .eq('slug', slug)
          .single();

        // It is possible the establishment does not exist
        if (error) {
            console.error('Establishment fetch error:', error);
            // We can set a fallback state or redirect
        }
        
        if (data) {
            setEstablishment(data);
        }
      } catch (error) {
        console.error('Unexpected error fetching establishment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstablishment();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
      </div>
    );
  }

  // Fallback default values if establishment data is missing fields
  const shopName = establishment?.name || 'BarberPro';
  const phone = establishment?.phone || '(11) 99999-9999';
  const address = 'Endereço não cadastrado'; // We don't have address in schema yet, using placeholder or maybe add to schema later
  // Using hardcoded address for now as requested by image unless we have a field
  
  // Colors from establishment or defaults
  const primaryColor = establishment?.primary_color || '#7C3AED';
  const secondaryColor = establishment?.secondary_color || '#2DD4BF';

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden flex flex-col font-sans selection:bg-[#7C3AED] selection:text-white">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-10 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-purple-500/20">
            {shopName.charAt(0)}
          </div>
          <span className="text-white font-bold text-xl tracking-tight">{shopName}</span>
        </div>
        
        <Link 
          to="/login" 
          className="text-xs font-medium text-gray-400 hover:text-white transition-all border border-white/10 px-4 py-2 rounded-full hover:bg-white/5 hover:border-white/20 uppercase tracking-wide"
        >
          Área do Profissional
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 relative z-10 text-center max-w-5xl mx-auto w-full py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block mb-8"
          >
            <span className="px-6 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-purple-500/25 border border-white/10">
              Estilo & Precisão
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tight">
            Seu visual, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] via-[#2DD4BF] to-[#2DD4BF]">
              Nossa obra de arte.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Agende seu horário em segundos e viva a experiência de uma barbearia moderna. 
            Sem filas, sem ligações, direto ao ponto.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto mb-20">
            <Link 
              to={`/agendar/${slug}`} 
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white rounded-xl font-bold text-lg shadow-xl shadow-purple-500/25 transition-all flex items-center justify-center gap-3 group hover:scale-[1.02]"
            >
              <Calendar className="w-5 h-5" />
              Agendar Agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              to="/minhas-reservas" 
              className="w-full sm:w-auto px-8 py-4 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-white/10 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 hover:scale-[1.02]"
            >
              <User className="w-5 h-5 text-gray-400" />
              Meus Agendamentos
            </Link>
          </div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 1: Horários */}
          <GlassCard className="p-6 flex items-start gap-4 hover:border-white/20 transition-colors group bg-[#18181B]/50">
            <div className="p-3 rounded-xl bg-[#10B981]/10 text-[#10B981] group-hover:bg-[#10B981]/20 transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 text-lg">Horários</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Seg - Sex: {establishment?.open_hour || '09:00'} - {establishment?.close_hour || '20:00'}</p>
              <p className="text-gray-400 text-sm leading-relaxed">Sáb: 09:00 - 18:00</p>
            </div>
          </GlassCard>

          {/* Card 2: Localização */}
          <GlassCard className="p-6 flex items-start gap-4 hover:border-white/20 transition-colors group bg-[#18181B]/50">
            <div className="p-3 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] group-hover:bg-[#7C3AED]/20 transition-colors">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 text-lg">Localização</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Av. Paulista, 1000</p>
              <p className="text-gray-400 text-sm leading-relaxed">São Paulo - SP</p>
            </div>
          </GlassCard>

          {/* Card 3: Contato */}
          <GlassCard className="p-6 flex items-start gap-4 hover:border-white/20 transition-colors group bg-[#18181B]/50">
            <div className="p-3 rounded-xl bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20 transition-colors">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 text-lg">Contato</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-2">{phone}</p>
              <div className="flex gap-3">
                <a href="#" className="text-gray-500 hover:text-white transition-colors">
                    <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 mt-12 bg-[#121212]">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} {shopName}. Desenvolvido por BarberPro.</p>
        </div>
      </footer>
    </div>
  );
}
