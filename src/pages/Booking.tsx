import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Service, Barber } from '../types/database';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { GlassCard } from '../components/GlassCard';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Scissors, Check, ChevronRight, ChevronLeft, Phone } from 'lucide-react';
import { PhoneCaptureModal } from '../components/modals/PhoneCaptureModal';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Helper for WhatsApp
const getWhatsAppLink = (phone: string | null, message: string) => {
  if (!phone) return '#';
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/55${cleanPhone}?text=${encodedMessage}`;
};

export default function Booking() {
  const { user: authUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedServiceId = searchParams.get('service');

  // Guest Logic State
  const [guestPhone, setGuestPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isGuestAuthenticated, setIsGuestAuthenticated] = useState(false);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Phone Capture State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<{time: string, label: string, available: boolean}[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Membership State
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    let mounted = true;
    
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);

    async function fetchData() {
      try {
        const [servicesRes, barbersRes] = await Promise.all([
          supabase.from('servicos').select('*').eq('ativo', true),
          supabase.from('barbeiros').select('*').eq('ativo', true),
        ]);

        if (!mounted) return;

        setServices(servicesRes.data || []);
        setBarbers(barbersRes.data || []);

        if (preSelectedServiceId) {
          const service = servicesRes.data?.find(s => s.id === preSelectedServiceId);
          if (service) setSelectedService(service);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        if (mounted) {
            setLoading(false);
            clearTimeout(timeoutId);
        }
      }
    }
    fetchData();

    return () => {
        mounted = false;
        clearTimeout(timeoutId);
    };
  }, [preSelectedServiceId]);

  // Check Membership
  useEffect(() => {
    async function checkMembership() {
        if (!authUser || !selectedBarber) return;
        
        // We need establishment_id to check subscription
        // Assuming all barbers belong to the same shop or we check via barber's establishment
        const { data: establishmentData } = await supabase
            .from('barbeiros')
            .select('establishment_id')
            .eq('id', selectedBarber.id)
            .single();

        if (!establishmentData?.establishment_id) return;

        const { data: subscription } = await supabase
            .from('client_subscriptions')
            .select('status, shop_plans(name)')
            .eq('client_id', authUser.id)
            .eq('establishment_id', establishmentData.establishment_id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .single();

        if (subscription) {
            setHasActiveMembership(true);
            // @ts-ignore
            setActivePlanName(subscription.shop_plans?.name);
            toast.success('Plano VIP Ativo! Seu corte será gratuito.', { icon: '👑' });
        } else {
            setHasActiveMembership(false);
            setActivePlanName(null);
        }
    }

    if (step === 2 && selectedBarber) {
        checkMembership();
    }
  }, [authUser, selectedBarber, step]);

  // Handle Guest Login
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestPhone) return;

    setIsCheckingPhone(true);
    try {
      // 1. Check if user exists by phone
      const { data: existingUsers, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('telefone', guestPhone)
        .limit(1);

      if (error) throw error;

      if (existingUsers && existingUsers.length > 0) {
        // User exists
        setGuestUserId(existingUsers[0].id);
        setGuestName(existingUsers[0].nome);
        setIsGuestAuthenticated(true);
        toast.success(`Bem-vindo de volta, ${existingUsers[0].nome}!`);
      } else {
        // New user - ask for name
        setIsNewUser(true);
      }
    } catch (error) {
      console.error('Error checking phone:', error);
      toast.error('Erro ao verificar telefone.');
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) return;

    setIsCheckingPhone(true);
    try {
        // Insert new user
        // Note: ID will be auto-generated by UUIDv4 default in DB
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nome: guestName,
                telefone: guestPhone,
                email: `${guestPhone.replace(/\D/g, '')}@guest.com`, // Dummy email for constraint
                tipo: 'cliente'
            }])
            .select()
            .single();

        if (error) throw error;

        setGuestUserId(data.id);
        setIsGuestAuthenticated(true);
        toast.success('Cadastro realizado!');
    } catch (error) {
        console.error('Error creating guest:', error);
        toast.error('Erro ao criar cadastro. Tente novamente.');
    } finally {
        setIsCheckingPhone(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    let mounted = true;
    
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);

    async function fetchData() {
      try {
        const [servicesRes, barbersRes] = await Promise.all([
          supabase.from('servicos').select('*').eq('ativo', true),
          supabase.from('barbeiros').select('*').eq('ativo', true),
        ]);

        if (!mounted) return;

        setServices(servicesRes.data || []);
        setBarbers(barbersRes.data || []);

        if (preSelectedServiceId) {
          const service = servicesRes.data?.find(s => s.id === preSelectedServiceId);
          if (service) setSelectedService(service);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        if (mounted) {
            setLoading(false);
            clearTimeout(timeoutId);
        }
      }
    }
    fetchData();

    return () => {
        mounted = false;
        clearTimeout(timeoutId);
    };
  }, [preSelectedServiceId]);

  // CALCULATE AVAILABILITY (The Brain)
  useEffect(() => {
    if (selectedBarber && selectedDate && selectedService) {
      async function calculateSlots() {
        setAvailableSlots([]); // Reset
        try {
          const { data: existingAppts, error } = await supabase
            .from('agendamentos')
            .select('horario, servicos:agendamentos_servicos(servicos(duracao_minutos))')
            .eq('barbeiro_id', selectedBarber?.id)
            .eq('data', selectedDate)
            .neq('status', 'cancelado');

          if (error) throw error;

          // Default Fallback Schedule
          let shopOpen = 9; 
          let shopClose = 19; 
          let lunchStart = 12;
          let lunchEnd = 13;

          // If barber has config, use it (Assuming it's in a table we haven't fetched fully yet, or use defaults)
          // For now, we enforce defaults if no explicit config found.
          // TODO: Fetch real schedule_config from 'barbeiros' or 'schedules' table

          const serviceDuration = selectedService?.duracao_minutos || 30;

          const busyIntervals = (existingAppts || []).map((appt: any) => {
             const [h, m] = appt.horario.split(':').map(Number);
             const startMins = h * 60 + m;
             const duration = appt.servicos?.[0]?.servicos?.duracao_minutos || 30;
             return { start: startMins, end: startMins + duration };
          });

          // Add Lunch Break to Busy Intervals
          busyIntervals.push({ start: lunchStart * 60, end: lunchEnd * 60 });

          const slots = [];
          for (let hour = shopOpen; hour < shopClose; hour++) {
            for (let minute of [0, 30]) {
               const currentSlotStart = hour * 60 + minute;
               const currentSlotEnd = currentSlotStart + serviceDuration;

               if (currentSlotEnd > shopClose * 60) continue;

               const isBusy = busyIntervals.some(interval => {
                 return (currentSlotStart < interval.end) && (currentSlotEnd > interval.start);
               });

               let isPast = false;
               if (selectedDate === new Date().toISOString().split('T')[0]) {
                 const now = new Date();
                 const nowMins = now.getHours() * 60 + now.getMinutes();
                 // Add small buffer (e.g. 15 mins)
                 if (currentSlotStart < nowMins + 15) isPast = true;
               }

               const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
               const labelString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
               
               slots.push({
                 time: timeString,
                 label: labelString,
                 available: !isBusy && !isPast
               });
            }
          }
          setAvailableSlots(slots);

        } catch (error) {
          console.error('Erro ao calcular horários:', error);
          toast.error('Erro ao verificar disponibilidade.');
        }
      }
      calculateSlots();
    }
  }, [selectedBarber, selectedDate, selectedService]);

  const handleBooking = async () => {
    // Determine User ID (Auth or Guest)
    const activeUserId = authUser ? authUser.id : guestUserId;

    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !activeUserId) return;

    try {
        setLoading(true);

        // 1. Phone Validation for Authenticated Users
        if (authUser) {
            const { data: userProfile, error: profileError } = await supabase
                .from('usuarios')
                .select('telefone')
                .eq('id', authUser.id)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
                // Continue? Maybe safer to block or ask
            }

            // If no phone found or empty string
            if (!userProfile?.telefone) {
                setLoading(false);
                setIsPhoneModalOpen(true);
                return; // STOP BOOKING
            }
        }

        // 2. Proceed with Booking
        const { data: appointmentData, error: appointmentError } = await supabase
            .from('agendamentos')
            .insert([
                {
                    usuario_id: activeUserId,
                    barbeiro_id: selectedBarber.id,
                    data: selectedDate,
                    horario: selectedTime,
                    preco_total: selectedService.preco,
                    status: 'pendente'
                }
            ])
            .select()
            .single();

        if (appointmentError) throw appointmentError;

        const { error: serviceError } = await supabase
            .from('agendamentos_servicos')
            .insert([
                {
                    agendamento_id: appointmentData.id,
                    servico_id: selectedService.id
                }
            ]);

        if (serviceError) throw serviceError;

        toast.success('Agendamento realizado com sucesso!');
        setStep(5); 
    } catch (error: any) {
        console.error('Erro ao agendar:', error);
        toast.error(error.message || 'Erro ao realizar agendamento.');
    } finally {
        setLoading(false);
    }
  };

  const handlePhoneUpdate = async (phone: string) => {
      if (!authUser) return;
      setIsUpdatingPhone(true);
      try {
          const { error } = await supabase
              .from('usuarios')
              .update({ telefone: phone })
              .eq('id', authUser.id);

          if (error) throw error;

          toast.success('Telefone salvo com sucesso!');
          setIsPhoneModalOpen(false);
          
          // Retry booking automatically
          handleBooking();

      } catch (error) {
          console.error('Error updating phone:', error);
          toast.error('Erro ao salvar telefone. Tente novamente.');
      } finally {
          setIsUpdatingPhone(false);
      }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  if (authLoading || loading) return (
    <div className="flex justify-center items-center min-h-screen bg-[#121212]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7C3AED]"></div>
    </div>
  );

  // GUEST LOGIN SCREEN (If not authenticated via Supabase AND not identified as guest)
  if (!authUser && !isGuestAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 bg-[#121212] min-h-screen">
        <GlassCard className="p-8 md:p-12 text-center max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
            
            <h2 className="text-2xl font-bold mb-2 text-white">Identifique-se</h2>
            <p className="mb-8 text-gray-400 text-sm">Digite seu telefone para agendar.</p>

            {!isNewUser ? (
                <form onSubmit={handleGuestLogin} className="space-y-4">
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <input 
                            type="tel" 
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED] transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCheckingPhone}
                        className="w-full bg-[#7C3AED] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/20 disabled:opacity-50"
                    >
                        {isCheckingPhone ? 'Verificando...' : 'Continuar'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleCreateGuest} className="space-y-4">
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 rounded-xl p-3 mb-4 text-[#2DD4BF] text-sm">
                            Parece que é sua primeira vez aqui! Por favor, diga seu nome.
                        </div>
                        <div className="relative mb-4">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input 
                                type="text" 
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Seu Nome Completo"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#7C3AED] transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isCheckingPhone}
                            className="w-full bg-[#7C3AED] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/20 disabled:opacity-50"
                        >
                            {isCheckingPhone ? 'Salvando...' : 'Começar Agendamento'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsNewUser(false)}
                            className="text-sm text-gray-500 mt-4 hover:text-white"
                        >
                            Voltar
                        </button>
                     </motion.div>
                </form>
            )}

            <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-gray-500 mb-3">É administrador ou funcionário?</p>
                <button
                    onClick={() => navigate('/login')}
                    className="text-sm font-medium text-[#7C3AED] hover:text-white transition-colors"
                >
                    Fazer Login Administrativo
                </button>
            </div>
        </GlassCard>
      </div>
    );
  }

  // BOOKING FLOW (Authenticated or Guest)
  return (
    <div className="bg-[#121212] min-h-screen py-12 pb-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-white/10 pb-4 gap-4">
             <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Agendar Horário
            </h2>
            <div className="text-left sm:text-right">
                <p className="text-sm text-gray-400">Agendando como:</p>
                <p className="text-white font-bold">{authUser?.user_metadata?.nome || guestName}</p>
            </div>
        </div>
        
        {/* Steps Indicator - Mobile Scrollable */}
        {step < 5 && (
            <nav aria-label="Progress" className="mb-8 sm:mb-12 overflow-x-auto pb-2">
                <ol role="list" className="flex space-x-4 sm:space-x-8 md:space-y-0 min-w-max">
                    {['Serviço', 'Barbeiro', 'Data e Hora', 'Confirmação'].map((stepName, index) => (
                        <li key={stepName} className="md:flex-1">
                            <div className={`group flex flex-col border-l-4 ${step > index + 1 ? 'border-[#7C3AED] hover:border-[#6D28D9]' : step === index + 1 ? 'border-[#7C3AED]' : 'border-white/10 hover:border-white/20'} py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors`}>
                                <span className={`text-xs sm:text-sm font-medium uppercase tracking-wider ${step > index + 1 ? 'text-[#7C3AED]' : step === index + 1 ? 'text-[#7C3AED]' : 'text-gray-500'}`}>Passo {index + 1}</span>
                                <span className="text-sm font-medium text-white">{stepName}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            </nav>
        )}

        {/* Step 1: Select Service */}
        {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <RadioGroup value={selectedService} onChange={setSelectedService}>
                    <RadioGroup.Label className="sr-only">Selecione um serviço</RadioGroup.Label>
                    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
                        {services.map((service) => (
                            <RadioGroup.Option
                                key={service.id}
                                value={service}
                                className={({ active, checked }) =>
                                    classNames(
                                        checked ? 'ring-2 ring-[#7C3AED] bg-white/10' : 'bg-white/5',
                                        'relative flex cursor-pointer rounded-2xl p-6 shadow-sm focus:outline-none hover:bg-white/10 transition-all border border-white/5'
                                    )
                                }
                            >
                                {({ checked, active }) => (
                                    <>
                                        <span className="flex flex-1">
                                            <span className="flex flex-col">
                                                <RadioGroup.Label as="span" className="block text-lg font-bold text-white">
                                                    {service.nome}
                                                </RadioGroup.Label>
                                                <RadioGroup.Description as="span" className="mt-2 flex items-center text-sm text-[#2DD4BF] font-medium">
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    {service.duracao_minutos} min - R$ {service.preco.toFixed(2)}
                                                </RadioGroup.Description>
                                                <RadioGroup.Description as="span" className="mt-4 text-sm text-gray-400">
                                                    {service.descricao}
                                                </RadioGroup.Description>
                                            </span>
                                        </span>
                                        <div className={`h-6 w-6 rounded-full border flex items-center justify-center ${checked ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-500'}`}>
                                            {checked && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </>
                                )}
                            </RadioGroup.Option>
                        ))}
                    </div>
                </RadioGroup>
                <div className="flex justify-end pt-6 sticky bottom-0 bg-[#121212] pb-4 z-10 border-t border-white/5">
                    <button
                        onClick={() => selectedService && setStep(2)}
                        disabled={!selectedService}
                        className="w-full sm:w-auto rounded-xl bg-[#7C3AED] px-8 py-4 text-base font-bold text-white hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7C3AED]/20 flex items-center justify-center"
                    >
                        Próximo <ChevronRight className="ml-2 w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        )}

        {/* Step 2: Select Barber */}
        {step === 2 && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <RadioGroup value={selectedBarber} onChange={setSelectedBarber}>
                     <RadioGroup.Label className="sr-only">Selecione um barbeiro</RadioGroup.Label>
                     <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-6">
                         {barbers.map((barber) => (
                             <RadioGroup.Option
                                 key={barber.id}
                                 value={barber}
                                 className={({ active, checked }) =>
                                     classNames(
                                         checked ? 'ring-2 ring-[#7C3AED] bg-white/10' : 'bg-white/5',
                                         'relative flex cursor-pointer rounded-2xl p-6 shadow-sm focus:outline-none hover:bg-white/10 transition-all border border-white/5'
                                     )
                                 }
                             >
                                 {({ checked, active }) => (
                                     <>
                                         <span className="flex flex-1">
                                             <span className="flex flex-col items-center text-center w-full">
                                                <div className={`h-24 w-24 rounded-full mb-4 flex items-center justify-center text-3xl overflow-hidden border-2 ${checked ? 'border-[#7C3AED]' : 'border-gray-700'}`}>
                                                    {barber.foto_url ? <img src={barber.foto_url} alt={barber.nome} className="h-full w-full object-cover"/> : <span className="text-gray-500">👤</span>}
                                                </div>
                                                 <RadioGroup.Label as="span" className="block text-lg font-bold text-white">
                                                     {barber.nome}
                                                 </RadioGroup.Label>
                                                 <RadioGroup.Description as="span" className="mt-1 flex items-center text-sm text-[#2DD4BF]">
                                                     {barber.especialidade}
                                                 </RadioGroup.Description>
                                             </span>
                                         </span>
                                         <div className={`absolute top-4 right-4 h-6 w-6 rounded-full border flex items-center justify-center ${checked ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-gray-500'}`}>
                                            {checked && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                     </>
                                 )}
                             </RadioGroup.Option>
                         ))}
                     </div>
                 </RadioGroup>
                 <div className="flex justify-between pt-6">
                     <button
                         onClick={() => setStep(1)}
                         className="rounded-xl border border-white/20 px-8 py-3 text-sm font-bold text-gray-300 hover:border-white hover:text-white transition-colors flex items-center"
                     >
                         <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                     </button>
                     <button
                         onClick={() => selectedBarber && setStep(3)}
                         disabled={!selectedBarber}
                         className="rounded-xl bg-[#7C3AED] px-8 py-3 text-sm font-bold text-white hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7C3AED]/20 flex items-center"
                     >
                         Próximo <ChevronRight className="ml-2 w-4 h-4" />
                     </button>
                 </div>
             </motion.div>
        )}

        {/* Step 3: Date and Time */}
        {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <GlassCard className="p-8">
                    <div className="mb-8">
                        <label htmlFor="date" className="block text-sm font-medium leading-6 text-gray-300 mb-2">
                            Escolha a Data
                        </label>
                        <div className="mt-2">
                            <input
                                type="date"
                                id="date"
                                min={today}
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setSelectedTime(''); 
                                }}
                                className="block w-full rounded-xl border-0 py-3 px-4 text-white bg-white/5 shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#7C3AED] sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>

                    {selectedDate && (
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-300 mb-4">
                                Horários Disponíveis ({selectedService?.duracao_minutos} min)
                            </label>
                            {availableSlots.length === 0 ? (
                                <p className="text-sm text-gray-500 border border-dashed border-gray-700 p-8 text-center rounded-xl">Nenhum horário disponível para esta data.</p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {availableSlots.map((slot) => (
                                        <button
                                            key={slot.time}
                                            onClick={() => slot.available && setSelectedTime(slot.time)}
                                            disabled={!slot.available}
                                            className={classNames(
                                                selectedTime === slot.time
                                                    ? 'bg-[#7C3AED] text-white ring-2 ring-[#7C3AED]'
                                                    : slot.available
                                                        ? 'bg-white/5 text-white hover:bg-white/10 ring-1 ring-white/10'
                                                        : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30',
                                                'rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition-all'
                                            )}
                                        >
                                            {slot.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </GlassCard>

                <div className="flex justify-between pt-6">
                    <button
                        onClick={() => setStep(2)}
                        className="rounded-xl border border-white/20 px-8 py-3 text-sm font-bold text-gray-300 hover:border-white hover:text-white transition-colors flex items-center"
                    >
                        <ChevronLeft className="mr-2 w-4 h-4" /> Voltar
                    </button>
                    <button
                        onClick={() => selectedDate && selectedTime && setStep(4)}
                        disabled={!selectedDate || !selectedTime}
                        className="rounded-xl bg-[#7C3AED] px-8 py-3 text-sm font-bold text-white hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#7C3AED]/20 flex items-center"
                    >
                         Próximo <ChevronRight className="ml-2 w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && selectedService && selectedBarber && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} >
                <GlassCard className="p-8 border border-white/10">
                    <h3 className="text-xl font-bold leading-7 text-white mb-6 flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6 text-[#7C3AED]" />
                        Confirmar Agendamento
                    </h3>
                    <dl className="divide-y divide-white/10">
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                            <dt className="text-sm font-medium leading-6 text-gray-400">Serviço</dt>
                            <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0 font-bold">{selectedService.nome}</dd>
                        </div>
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                            <dt className="text-sm font-medium leading-6 text-gray-400">Preço</dt>
                            <dd className="mt-1 text-sm leading-6 text-[#2DD4BF] sm:col-span-2 sm:mt-0 font-bold">R$ {selectedService.preco.toFixed(2)}</dd>
                        </div>
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                            <dt className="text-sm font-medium leading-6 text-gray-400">Barbeiro</dt>
                            <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0">{selectedBarber.nome}</dd>
                        </div>
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                            <dt className="text-sm font-medium leading-6 text-gray-400">Data e Hora</dt>
                            <dd className="mt-1 text-sm leading-6 text-white sm:col-span-2 sm:mt-0">
                                {format(parseISO(selectedDate), 'dd/MM/yyyy')} às {selectedTime.slice(0, 5)}
                            </dd>
                        </div>
                    </dl>
                    
                    <div className="flex justify-between mt-8 gap-3">
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 sm:flex-none rounded-xl border border-white/20 px-6 py-4 text-base font-bold text-gray-300 hover:border-white hover:text-white transition-colors flex items-center justify-center"
                        >
                            <ChevronLeft className="mr-2 w-5 h-5" /> Voltar
                        </button>
                        <button
                            onClick={handleBooking}
                            disabled={loading}
                            className="flex-1 sm:flex-none rounded-xl bg-[#10B981] px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-[#059669] transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? 'Confirmando...' : 'Confirmar'} <Check className="ml-2 w-5 h-5" />
                        </button>
                    </div>
                </GlassCard>
            </motion.div>
        )}

        {/* Step 5: Success & WhatsApp */}
        {step === 5 && selectedService && selectedBarber && (
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                 <div className="rounded-full bg-[#10B981]/20 h-24 w-24 flex items-center justify-center mx-auto mb-6 border-2 border-[#10B981]">
                    <CheckCircleIcon className="h-16 w-16 text-[#10B981]" />
                 </div>
                 <h2 className="text-3xl font-bold text-white mb-4">Agendamento Confirmado!</h2>
                 <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Seu horário foi reservado com sucesso. Você pode acompanhar o status no seu perfil.
                 </p>
                 
                 <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    <a 
                        href={getWhatsAppLink(
                            selectedBarber.telefone || '11999999999',
                            `Olá! Acabei de agendar um ${selectedService.nome} para dia ${format(parseISO(selectedDate), 'dd/MM')} às ${selectedTime.slice(0, 5)}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#10B981] px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-[#059669] flex items-center justify-center gap-2 transition-all"
                    >
                        <span>📲</span> Confirmar via WhatsApp
                    </a>
                    
                    <button
                        onClick={() => navigate('/perfil')}
                        className="rounded-xl border border-white/20 px-6 py-4 text-base font-bold text-gray-300 hover:border-white hover:text-white transition-colors"
                    >
                        Ir para Meus Agendamentos
                    </button>
                 </div>
             </motion.div>
        )}

      </div>

      <PhoneCaptureModal 
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onConfirm={handlePhoneUpdate}
        loading={isUpdatingPhone}
      />
    </div>
  );
}
