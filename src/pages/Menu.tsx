import { GlassCard } from '../components/GlassCard';
import { Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, User, Award } from 'lucide-react'; // Added Award
import { motion } from 'framer-motion'; // Changed to framer-motion
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Menu() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: Award, label: 'Programa de Fidelidade', desc: 'Veja seu progresso e recompensas', path: '/fidelidade' }, // New Item
    { icon: User, label: 'Configurações de Perfil', desc: 'Gerencie sua conta' },
    { icon: Bell, label: 'Notificações', desc: 'Configure seus alertas' },
    { icon: Shield, label: 'Privacidade e Segurança', desc: 'Senha e 2FA' },
    { icon: HelpCircle, label: 'Ajuda e Suporte', desc: 'Obtenha assistência' },
  ];

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto pb-24">
      {/* ... header ... */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-white/60">Personalize sua experiência no app</p>
      </div>

      <GlassCard className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center text-2xl font-bold text-white">
            JD
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">John Doe</h2>
            <p className="text-white/60">john.doe@exemplo.com</p>
            <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#7C3AED] text-xs font-bold uppercase tracking-wider">
              Membro Pro
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {menuItems.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <GlassCard 
                className="p-4 cursor-pointer group" 
                hover
                onClick={() => item.path && navigate(item.path)} // Navigate on click
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#7C3AED] group-hover:text-white transition-colors text-white/60">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{item.label}</h3>
                    <p className="text-white/40 text-sm">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSignOut}
        className="w-full mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
      >
        <LogOut className="w-5 h-5" />
        Sair da Conta
      </motion.button>
    </div>
  );
}
