import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { appointmentsService } from '../../services/appointments';
import { X, Calendar, Clock, User, Scissors } from 'lucide-react';
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
      const startsAt = `${data.date}T${data.time}:00`;
      
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Novo Agendamento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          
          {/* Client Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Cliente</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="walk-in" {...register('clientType')} className="text-indigo-600" />
                Avulso
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" value="registered" {...register('clientType')} className="text-indigo-600" />
                Cadastrado
              </label>
            </div>

            {clientType === 'registered' ? (
              <select {...register('clientId', { required: clientType === 'registered' })} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name || c.email} ({c.phone})</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <input 
                  {...register('clientName', { required: clientType === 'walk-in' })}
                  placeholder="Nome do cliente"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <input 
                  {...register('clientPhone')}
                  placeholder="Telefone (opcional)"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Service & Barber */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
              <select {...register('serviceId', { required: true })} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">Selecione...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos}m)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barbeiro</label>
              <select {...register('barberId', { required: true })} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">Selecione...</option>
                {barbers.map(b => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input 
                type="date" 
                {...register('date', { required: true })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              <select {...register('time', { required: true })} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">Selecione...</option>
                {availability.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
