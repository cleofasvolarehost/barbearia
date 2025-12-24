import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function SetupWelcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Bem-vindo ao CyberSalon!</h1>
        <p className="text-gray-400 mb-8">
            Sua conta foi criada com sucesso. Verifique seu e-mail para acessar sua senha temporária e começar a configurar sua barbearia.
        </p>
        
        <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
        >
            Ir para Login <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
