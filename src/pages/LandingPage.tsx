import { useState } from 'react';
import { motion } from 'motion/react'; // Ajustado import
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  Zap, 
  Shield, 
  Users,
  Check,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Star,
  BarChart3,
  Clock,
  Smartphone,
  LayoutDashboard
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const onEnterApp = () => {
    navigate('/cadastro');
  };

  const onLogin = () => {
    if (user) {
      navigate('/minhas-reservas');
    } else {
      navigate('/login');
    }
  };

  const features = [
    {
      icon: Calendar,
      title: "Agenda Inteligente",
      description: "Drag-and-drop intuitivo com visualização em tempo real. Nunca mais perca um horário."
    },
    {
      icon: TrendingUp,
      title: "Análise Financeira",
      description: "Dashboard completo com gráficos, comissões e previsões de receita."
    },
    {
      icon: Users,
      title: "Gestão de Equipe",
      description: "Controle de profissionais, horários e performance individual."
    },
    {
      icon: Zap,
      title: "Super Rápido",
      description: "Interface otimizada que carrega em segundos. Produtividade máxima."
    },
    {
      icon: Smartphone,
      title: "100% Responsivo",
      description: "Funciona perfeitamente em qualquer dispositivo. Mobile-first."
    },
    {
      icon: Shield,
      title: "Seguro & Confiável",
      description: "Seus dados protegidos com criptografia de ponta."
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: "97",
      description: "Ideal para começar",
      features: [
        "1 Profissional",
        "Agenda Digital",
        "Relatórios Básicos",
        "Suporte por Email",
        "App Mobile"
      ],
      highlighted: false
    },
    {
      name: "Professional",
      price: "197",
      description: "Mais popular",
      features: [
        "Até 5 Profissionais",
        "Agenda Inteligente",
        "Analytics Avançado",
        "Comissões Automáticas",
        "Suporte Prioritário",
        "API de Integração"
      ],
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "397",
      description: "Para barbearias grandes",
      features: [
        "Profissionais Ilimitados",
        "Tudo do Professional",
        "Múltiplas Unidades",
        "White Label",
        "Gerente de Sucesso",
        "SLA Garantido"
      ],
      highlighted: false
    }
  ];

  const testimonials = [
    {
      name: "Carlos Mendes",
      role: "Dono da Barbearia Elegance",
      image: "https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
      text: "Aumentei meu faturamento em 40% no primeiro mês. A agenda inteligente eliminou horários vagos."
    },
    {
      name: "Marina Santos",
      role: "Gestora da Barbearia Glam",
      image: "https://images.unsplash.com/photo-1763048208932-cbe149724374?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
      text: "Finalmente consigo ver quanto cada profissional está gerando. O dashboard é simplesmente perfeito!"
    },
    {
      name: "Ricardo Oliveira",
      role: "Barbeiro Autônomo",
      image: "https://images.unsplash.com/photo-1758556549027-879615701c61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
      text: "A melhor decisão que tomei. Meus clientes amam poder agendar pelo app a qualquer hora."
    }
  ];

  const faqs = [
    {
      question: "Como funciona o período de teste?",
      answer: "Oferecemos 14 dias grátis sem necessidade de cartão de crédito. Você pode testar todas as funcionalidades antes de decidir."
    },
    {
      question: "Posso mudar de plano depois?",
      answer: "Sim! Você pode fazer upgrade ou downgrade a qualquer momento. As mudanças são aplicadas imediatamente."
    },
    {
      question: "Os dados ficam seguros?",
      answer: "Absolutamente. Utilizamos criptografia de nível bancário e backup automático diário. Seus dados estão 100% protegidos."
    },
    {
      question: "Funciona offline?",
      answer: "Sim, o app mobile funciona offline e sincroniza automaticamente quando voltar a conexão."
    },
    {
      question: "Tem suporte em português?",
      answer: "Sim! Nossa equipe de suporte fala português e está disponível via chat, email e WhatsApp."
    }
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#121212]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl">CyberBarber</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="hover:text-[#2DD4BF] transition-colors">Recursos</a>
              <a href="#pricing" className="hover:text-[#2DD4BF] transition-colors">Preços</a>
              <a href="#testimonials" className="hover:text-[#2DD4BF] transition-colors">Depoimentos</a>
              <a href="#faq" className="hover:text-[#2DD4BF] transition-colors">FAQ</a>
              <button onClick={onLogin} className="hover:text-[#2DD4BF] transition-colors font-medium flex items-center gap-2">
                {user ? (
                    <>
                        <LayoutDashboard className="w-4 h-4" />
                        Meu Painel
                    </>
                ) : (
                    'Login'
                )}
              </button>
              {!user && (
                  <button
                    onClick={onEnterApp}
                    className="px-6 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-lg hover:shadow-[#7C3AED]/50 transition-all font-bold"
                  >
                    Criar Conta Grátis
                  </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-white/5"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-[#1a1a1a] border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-2 hover:text-[#2DD4BF]" onClick={() => setMobileMenuOpen(false)}>Recursos</a>
              <a href="#pricing" className="block py-2 hover:text-[#2DD4BF]" onClick={() => setMobileMenuOpen(false)}>Preços</a>
              <a href="#testimonials" className="block py-2 hover:text-[#2DD4BF]" onClick={() => setMobileMenuOpen(false)}>Depoimentos</a>
              <a href="#faq" className="block py-2 hover:text-[#2DD4BF]" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <button
                onClick={onLogin}
                className="block w-full text-left py-2 hover:text-[#2DD4BF] font-medium"
              >
                Login
              </button>
              <button
                onClick={onEnterApp}
                className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] font-bold mt-2"
              >
                Criar Conta Grátis
              </button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#2DD4BF]/20 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur border border-white/10 mb-6">
                <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
                <span className="text-sm">A Revolução Digital para Barbearias</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
                Gestão <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">Cyberpunk</span> para Sua Barbearia
              </h1>

              <p className="text-xl text-gray-400 mb-8">
                Dashboard inteligente que aumenta sua receita em até 40%. Agenda drag-and-drop, analytics em tempo real e controle total do seu negócio.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onEnterApp}
                  className="group px-8 py-4 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-2xl hover:shadow-[#7C3AED]/50 transition-all flex items-center justify-center space-x-2"
                >
                  <span className="font-semibold">Começar Grátis</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 rounded-full border-2 border-white/20 hover:bg-white/5 transition-all">
                  Ver Demo
                </button>
              </div>

              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-[#2DD4BF]" />
                  <span>14 dias grátis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-[#2DD4BF]" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-[#2DD4BF]" />
                  <span>Cancele quando quiser</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-[#7C3AED]/20">
                <img
                  src="https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiYXJiZXIlMjBzaG9wfGVufDF8fHx8MTc2NjE3MDUyMHww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Modern Barbershop"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
              </div>

              {/* Floating Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#2DD4BF]/50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2DD4BF]">+40%</p>
                    <p className="text-sm text-gray-400">Aumento médio</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute -top-6 -right-6 p-4 rounded-2xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#7C3AED]/50 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">5.2k+</p>
                    <p className="text-sm text-gray-400">Salões ativos</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Tudo que Você Precisa em <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">Um Só Lugar</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Ferramenta completa para transformar sua barbearia em uma máquina de fazer dinheiro
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-3xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 hover:border-[#7C3AED]/50 transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, value: "5.2k+", label: "Salões Ativos" },
              { icon: Calendar, value: "1.2M+", label: "Agendamentos/mês" },
              { icon: BarChart3, value: "R$ 47M", label: "Processado/mês" },
              { icon: Clock, value: "99.9%", label: "Uptime" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 rounded-3xl bg-white/5 backdrop-blur border border-white/10"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8" />
                </div>
                <p className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">{stat.value}</p>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a0a0a] to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Planos para <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">Qualquer Tamanho</span>
            </h2>
            <p className="text-xl text-gray-400">Comece grátis. Cresça quando quiser.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-8 rounded-3xl border ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#7C3AED]/10 to-transparent border-[#7C3AED] shadow-2xl shadow-[#7C3AED]/20 scale-105'
                    : 'bg-white/5 backdrop-blur border-white/10'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-sm font-semibold">
                    Mais Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold">R$ {plan.price}</span>
                  <span className="text-gray-400">/mês</span>
                </div>

                <button
                  onClick={onEnterApp}
                  className={`w-full py-4 rounded-full font-semibold mb-8 transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] hover:shadow-lg hover:shadow-[#7C3AED]/50'
                      : 'border-2 border-white/20 hover:bg-white/5'
                  }`}
                >
                  Começar Agora
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-[#2DD4BF] flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              O Que Nossos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">Clientes Dizem</span>
            </h2>
            <p className="text-xl text-gray-400">Histórias reais de transformação</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-[#2DD4BF] text-[#2DD4BF]" />
                  ))}
                </div>

                <p className="text-gray-300 mb-6 italic">"{testimonial.text}"</p>

                <div className="flex items-center space-x-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Perguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF]">Frequentes</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-left">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 flex-shrink-0 transition-transform ${
                      faqOpen === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {faqOpen === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-gray-400">{faq.answer}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative p-12 rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

            <div className="relative text-center">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                Pronto para Revolucionar Seu Salão?
              </h2>
              <p className="text-xl mb-8 text-white/90">
                Junte-se a 5.200+ salões que já transformaram seu negócio
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onEnterApp}
                  className="group px-8 py-4 rounded-full bg-[#121212] hover:bg-[#1a1a1a] transition-all flex items-center justify-center space-x-2"
                >
                  <span className="font-semibold">Começar Grátis por 14 Dias</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 rounded-full border-2 border-white hover:bg-white/10 transition-all">
                  Falar com Vendas
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="font-bold text-xl">CyberBarber</span>
              </div>
              <p className="text-gray-400 text-sm">
                O futuro da gestão de barbearias.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-[#2DD4BF] transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-[#2DD4BF] transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Atualizações</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              © 2024 CyberBarber. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-[#2DD4BF] transition-colors">Twitter</a>
              <a href="#" className="text-gray-400 hover:text-[#2DD4BF] transition-colors">Instagram</a>
              <a href="#" className="text-gray-400 hover:text-[#2DD4BF] transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
