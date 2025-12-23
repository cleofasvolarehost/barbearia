import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { appointmentsService } from '../../services/appointments';
import { X, Calendar, Clock, User, Scissors, ChevronDown } from 'lucide-react';
import { format, addMinutes, formatISO, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barbershopId: string;
}

interface FormData {
  clientType: 'registered' | 'walk-in';
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
}

export function CreateAppointmentModal({ isOpen, onClose, onSuccess, barbershopId }: CreateAppointmentModalProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      clientType: 'walk-in'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [availability, setAvailability] = useState<string[]>([]); // simplified slots
  
  const selectedServiceId = watch('serviceId');
  const selectedBarberId = watch('barberId');
  const selectedDate = watch('date');
  const clientType = watch('clientType');

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      const [servicesRes, barbersRes, clientsRes] = await Promise.all([
        supabase.from('servicos').select('id, nome, duracao_minutos, preco').eq('ativo', true),
        supabase.from('barbeiros').select('id, nome').eq('ativo', true),
        supabase.from('profiles').select('id, full_name, phone').limit(50) // Limit for performance
      ]);
      
      if (servicesRes.data) setServices(servicesRes.data);
      if (barbersRes.data) setBarbers(barbersRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Check availability when date/barber changes
  useEffect(() => {
    if (selectedBarberId && selectedDate && selectedServiceId) {
      checkAvailability();
    }
  }, [selectedBarberId, selectedDate, selectedServiceId]);

  const checkAvailability = async () => {
    // This is a simplified logic. In a real app, we'd calculate slots based on opening hours and duration.
    // Here we just fetch booked slots to warn user, or ideally generate free slots.
    // For manual admin entry, we often want to allow overriding or at least seeing what's free.
    // Let's generate 30min slots for the day and disable booked ones.
    
    // Fetch shop settings for hours (mocked for now or use default)
    const startHour = 9;
    const endHour = 19;
    
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    
    // Filter out booked slots
    try {
      const booked = await appointmentsService.getAvailability(selectedBarberId, selectedDate);
      // booked is array of { starts_at, ends_at }
      // We need to disable slots that overlap
      // This logic can be complex. For MVP, let's just show all slots and error on submit if conflict.
      setAvailability(slots); 
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const startsAt = formatISO(parseISO(`${data.date}T${data.time}:00`));
      
      await appointmentsService.createAppointment({
        barbershop_id: barbershopId,
        barber_id: data.barberId,
        service_id: data.serviceId,
        client_id: data.clientType === 'registered' ? data.clientId : undefined,
        client_name: data.clientType === 'walk-in' ? data.clientName : undefined,
        client_phone: data.clientType === 'walk-in' ? data.clientPhone : undefined,
        starts_at: startsAt // ISO format will be parsed by service
      });
      
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#1F2937]">Novo Agendamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          
          {/* Client Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-6">
                <label className="text-sm font-medium text-gray-600">Cliente</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                        <input 
                            type="radio" 
                            value="walk-in" 
                            {...register('clientType')} 
                            className="peer sr-only" 
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-[#635BFF] peer-checked:bg-[#635BFF] transition-all"></div>
                        <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">Novo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <div className="relative flex items-center justify-center">
                        <input 
                            type="radio" 
                            value="registered" 
                            {...register('clientType')} 
                            className="peer sr-only" 
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-[#635BFF] peer-checked:bg-[#635BFF] transition-all"></div>
                        <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">Cadastrado</span>
                  </label>
                </div>
            </div>

            {clientType === 'registered' ? (
              <div className="relative">
                  <select 
                    {...register('clientId', { required: clientType === 'registered' })} 
                    className="w-full h-12 pl-4 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF] appearance-none"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name || c.email} ({c.phone})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                  </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input 
                  {...register('clientName', { required: clientType === 'walk-in' })}
                  placeholder="Nome do cliente"
                  className="w-full h-12 px-4 rounded-xl border-gray-200 placeholder-gray-400 text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF]"
                />
                <input 
                  {...register('clientPhone')}
                  placeholder="Telefone (opcional)"
                  className="w-full h-12 px-4 rounded-xl border-gray-200 placeholder-gray-400 text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF]"
                />
              </div>
            )}
          </div>

          {/* Service & Barber */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500">Serviço</label>
              <div className="relative">
                  <select 
                    {...register('serviceId', { required: true })} 
                    className="w-full h-12 pl-4 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF] appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos}m)</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                  </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500">Barbeiro</label>
              <div className="relative">
                  <select 
                    {...register('barberId', { required: true })} 
                    className="w-full h-12 pl-4 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF] appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {barbers.map(b => (
                      <option key={b.id} value={b.id}>{b.nome}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                  </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500">Data</label>
              <div className="relative">
                <input 
                  type="date" 
                  {...register('date', { required: true })}
                  className="w-full h-12 pl-4 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-500">Horário</label>
              <div className="relative">
                  <select 
                    {...register('time', { required: true })} 
                    className="w-full h-12 pl-4 pr-10 rounded-xl border-gray-200 bg-white text-gray-900 shadow-sm focus:border-[#635BFF] focus:ring-[#635BFF] appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {availability.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown className="w-4 h-4" />
                  </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-sm font-bold text-white bg-[#635BFF] rounded-xl hover:bg-[#5349E0] disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
            >
              {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
