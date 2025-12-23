import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Service, Barber } from '../types/database';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { bookingsApi } from '../api/bookings';

import { getAvailableSlots } from '../utils/availability';

// Premium Components
import { BarberSelection } from '../components/booking/premium/BarberSelection';
import { ServiceSelection } from '../components/booking/premium/ServiceSelection';
import { TimeSelection } from '../components/booking/premium/TimeSelection';
import { PaymentStep } from '../components/booking/premium/PaymentStep';
import { SuccessStep } from '../components/booking/premium/SuccessStep';
import { FastCheckoutModal, GuestData } from '../components/FastCheckoutModal';
import { PhoneCaptureModal } from '../components/modals/PhoneCaptureModal';

// Types
type BookingStep = 'barber' | 'service' | 'datetime' | 'payment' | 'success';

export default function BookSlug() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State - Data
  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  // State - Selection
  const [step, setStep] = useState<BookingStep>('barber');
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // State - Guest Auth & Payment
  const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixCode, setPixCode] = useState<string>('');

  // Phone Capture for Auth Users
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // 1. Fetch Shop & Services based on Slug
  useEffect(() => {
    async function fetchShopData() {
      if (!slug) return;
      try {
        const { data: shopData, error: shopError } = await supabase
          .from('establishments')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (shopError || !shopData) {
          toast.error('Barbearia não encontrada');
          navigate('/'); 
          return;
        }
        setShop(shopData);

        const { data: servicesData } = await supabase
          .from('servicos')
          .select('*')
          .eq('ativo', true)
          .eq('establishment_id', shopData.id);
        setServices(servicesData || []);

        const { data: teamData } = await supabase
            .from('barbeiros')
            .select('*')
            .eq('establishment_id', shopData.id)
            .eq('ativo', true);
        setProfessionals(teamData || []);

      } catch (error) {
        console.error('Error loading shop:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShopData();
  }, [slug, navigate]);

  // 2. Availability Engine
  useEffect(() => {
    async function fetchAvailability() {
        if (selectedDate && selectedBarber) {
            // Use centralized logic that considers Overrides
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const slots = await getAvailableSlots(
                dateStr, 
                selectedBarber.id, 
                selectedService?.duracao_minutos || 30
            );
            setAvailableSlots(slots);
        }
    }
    fetchAvailability();
  }, [selectedDate, selectedBarber, selectedService]);

  // Handlers
  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    setStep('service');
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('datetime');
  };

  const handleTimeSelect = (time: string, date: Date) => {
    setSelectedTime(time);
    setSelectedDate(date);
    
    // Check auth status
    if (user) {
        setStep('payment');
    } else {
        setIsFastCheckoutOpen(true);
    }
  };

  const handleGuestSubmit = (data: GuestData) => {
    setGuestData(data);
    setIsFastCheckoutOpen(false);
    setStep('payment');
  };

  const handlePaymentConfirm = async (method: 'pix' | 'counter') => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return;
    
    setIsProcessing(true);
    try {
        let userId = user?.id;
        let clientPhone = user?.user_metadata?.telefone || guestData?.phone;
        const clientName = user?.user_metadata?.nome || guestData?.name;

        // 1. Golden Rule: Validate Phone for Authenticated Users
        if (user && !clientPhone) {
            // Check DB to be sure (metadata might be stale)
            const { data: dbUser } = await supabase
                .from('usuarios')
                .select('telefone')
                .eq('id', user.id)
                .single();
            
            if (dbUser?.telefone) {
                clientPhone = dbUser.telefone;
            } else {
                // STOP and Ask for Phone
                setIsProcessing(false);
                setIsPhoneModalOpen(true);
                return;
            }
        }

        // Guest User Logic
        if (!userId && guestData) {
            const { data: existingUser } = await supabase
                .from('usuarios')
                .select('id')
                .eq('telefone', guestData.phone)
                .single();

            if (existingUser) {
                userId = existingUser.id;
            } else {
                const { data: newUser, error: createError } = await supabase
                    .from('usuarios')
                    .insert({
                        nome: guestData.name,
                        telefone: guestData.phone,
                        tipo: 'client',
                        data_nascimento: guestData.birthDate || null
                    })
                    .select()
                    .single();
                
                if (createError) throw createError;
                userId = newUser.id;
            }
        }

        if (!userId) userId = 'guest_placeholder';

        // PIX Logic
        if (method === 'pix') {
             if (!shop.accepts_pix) {
                 toast.error('Pagamento online indisponível no momento.');
                 setIsProcessing(false);
                 return;
             }
             
             // Simulate PIX generation
             setPixCode('00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913Barbearia Demo6009Sao Paulo62070503***6304E2CA');
             
             // Wait for "payment" (Simulation)
             setTimeout(async () => {
                 await createBooking(userId!, clientName, clientPhone);
             }, 3000); // Auto confirm after 3s for demo
             return;
        }

        // Counter Logic
        await createBooking(userId!, clientName, clientPhone);

    } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Erro ao agendar');
        setIsProcessing(false);
    }
  };

  const handlePhoneUpdate = async (phone: string) => {
      if (!user) return;
      setIsUpdatingPhone(true);
      try {
          // Update DB
          const { error } = await supabase
              .from('usuarios')
              .update({ telefone: phone })
              .eq('id', user.id);

          if (error) throw error;

          // Update Metadata (optional but good for UX consistency)
          await supabase.auth.updateUser({
              data: { telefone: phone }
          });

          toast.success('Telefone salvo!');
          setIsPhoneModalOpen(false);
          
          // Retry booking automatically (will pass validation now)
          // We don't know the method (pix/counter) here easily without storing it, 
          // but usually premium flow defaults to one or the user clicks again.
          // Better UX: Just close and let user click "Confirm" again, or store method in state.
          // For now, let's close and let user click (safe) or we can trigger it.
          // Actually, let's just close. The user is still on the Payment Step.
          // They just need to click "Pagar no Local" or "Pagar Pix" again.
          
      } catch (error) {
          console.error('Error updating phone:', error);
          toast.error('Erro ao salvar telefone.');
      } finally {
          setIsUpdatingPhone(false);
      }
  };

  const createBooking = async (userId: string, clientName?: string, clientPhone?: string) => {
    if (!selectedService || !selectedBarber) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const result = await bookingsApi.create({
        date: dateStr,
        time: selectedTime,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        userId: userId,
        price: selectedService.preco,
        shopConfig: shop?.whatsapp_config,
        clientPhone,
        clientName
    });

    if (!result.success) {
        // SMART RECOVERY: If time is passed/unavailable, suggest next slot
        if (result.message?.match(/(passou|indisponível|passed|unavailable)/i)) {
            const currentIndex = availableSlots.indexOf(selectedTime);
            
            // Check if there is a next slot available
            if (currentIndex !== -1 && currentIndex < availableSlots.length - 1) {
                const nextSlot = availableSlots[currentIndex + 1];
                
                // Update state
                setSelectedTime(nextSlot);
                
                // Show interactive toast
                toast.error(
                    (t) => (
                        <div className="flex flex-col gap-1">
                            <span>❌ O horário {selectedTime} expirou.</span>
                            <span className="font-bold text-[#2DD4BF] animate-pulse">➜ Mudamos para {nextSlot}</span>
                            <span className="text-xs opacity-75">Confirme novamente para garantir.</span>
                        </div>
                    ), 
                    { duration: 6000 }
                );
                
                setIsProcessing(false);
                return; // Exit and let user confirm with new time
            }
        }
        throw new Error(result.message);
    }
    
    setStep('success');
    setIsProcessing(false);
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin h-10 w-10 border-2 border-[#7C3AED] rounded-full"></div></div>;

  const branding = {
      primaryColor: shop?.primary_color || '#7C3AED',
      logoUrl: shop?.logo_url,
      bannerUrl: shop?.banner_url,
      shopName: shop?.name || 'Barbearia'
  };

  // Render Steps
  return (
    <>
      <FastCheckoutModal 
        isOpen={isFastCheckoutOpen}
        onClose={() => setIsFastCheckoutOpen(false)}
        onConfirm={handleGuestSubmit}
      />

      {step === 'barber' && (
        <BarberSelection 
            barbers={professionals} 
            onSelect={handleBarberSelect} 
            selectedBarberId={selectedBarber?.id}
            branding={branding}
        />
      )}

      {step === 'service' && (
        <ServiceSelection 
            services={services} 
            onSelect={handleServiceSelect} 
            onBack={() => setStep('barber')}
            selectedServiceId={selectedService?.id}
            branding={branding}
        />
      )}

      {step === 'datetime' && (
        <TimeSelection 
            availableSlots={availableSlots}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onConfirm={handleTimeSelect}
            onBack={() => setStep('service')}
            branding={branding}
        />
      )}

      {step === 'payment' && selectedService && selectedBarber && (
        <PaymentStep 
            onBack={() => setStep('datetime')}
            onConfirm={handlePaymentConfirm}
            serviceName={selectedService.nome}
            servicePrice={selectedService.preco}
            barberName={selectedBarber.nome}
            dateStr={format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            timeStr={selectedTime}
            pixCode={pixCode}
            isProcessing={isProcessing}
            branding={branding}
        />
      )}

      {step === 'success' && selectedService && selectedBarber && (
        <SuccessStep 
            dateStr={format(selectedDate, "dd/MM", { locale: ptBR })}
            timeStr={selectedTime}
            barberName={selectedBarber.nome}
            serviceName={selectedService.nome}
            onRestart={() => {
                setStep('barber');
                setSelectedBarber(null);
                setSelectedService(null);
                setSelectedTime('');
                setPixCode('');
            }}
            branding={branding}
        />
      )}

      <PhoneCaptureModal 
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onConfirm={handlePhoneUpdate}
        loading={isUpdatingPhone}
      />
    </>
  );
}
