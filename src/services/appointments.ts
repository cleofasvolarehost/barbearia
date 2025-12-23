import { supabase } from '../lib/supabase';
import { Appointment, AppointmentFilters, CreateAppointmentPayload, AppointmentStatus } from '../types/appointments';
import { addMinutes, formatISO, parseISO } from 'date-fns';

export const appointmentsService = {
  async listAppointments(filters: AppointmentFilters) {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        barber:barbeiros(id, nome, foto_url),
        service:servicos(id, nome, duracao_minutos, preco),
        client:profiles(id, full_name, phone, avatar_url)
      `, { count: 'exact' });

    if (filters.barbershop_id) {
      query = query.eq('barbershop_id', filters.barbershop_id);
    }

    if (filters.dateRange) {
      query = query
        .gte('starts_at', filters.dateRange.start)
        .lte('starts_at', filters.dateRange.end);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.barber_id) {
      query = query.eq('barber_id', filters.barber_id);
    }

    if (filters.service_id) {
      query = query.eq('service_id', filters.service_id);
    }

    if (filters.search) {
      // Search by client name or phone (both in registered profile or walk-in fields)
      // This is tricky with Supabase basic filtering if mixing joins and columns.
      // We'll try a simpler approach: check local columns first.
      // For proper search across joins, we might need a view or RPC.
      // For now, let's search client_name and client_phone columns.
      query = query.or(`client_name.ilike.%${filters.search}%,client_phone.ilike.%${filters.search}%`);
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order('starts_at', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data as Appointment[], count };
  },

  async createAppointment(payload: CreateAppointmentPayload) {
    // 1. Get service duration to calculate ends_at
    const { data: service, error: serviceError } = await supabase
      .from('servicos')
      .select('nome, duracao_minutos')
      .eq('id', payload.service_id)
      .single();

    if (serviceError || !service) throw new Error('Serviço não encontrado');

    const startsAt = parseISO(payload.starts_at);
    const endsAt = addMinutes(startsAt, service.duracao_minutos);

    // 2. Check conflicts (Server-side validation ideally, but we do client-side first check here via query)
    // We check if any appointment for this barber overlaps with the requested time.
    // Overlap: (start1 < end2) and (start2 < end1)
    const { count: conflictCount, error: conflictError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('barber_id', payload.barber_id)
      .neq('status', 'cancelled')
      .lt('starts_at', formatISO(endsAt))
      .gt('ends_at', formatISO(startsAt));

    if (conflictError) throw conflictError;

    if (conflictCount && conflictCount > 0) {
      throw new Error('Horário indisponível para este barbeiro.');
    }

    // 3. Create
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        barbershop_id: payload.barbershop_id,
        client_id: payload.client_id,
        client_name: payload.client_name,
        client_phone: payload.client_phone,
        service_id: payload.service_id,
        service_name: service.nome,
        barber_id: payload.barber_id,
        starts_at: payload.starts_at,
        ends_at: formatISO(endsAt),
        status: 'scheduled',
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAppointment(id: string, payload: Partial<Appointment>) {
    // If updating time, check conflicts again? 
    // For now, simple update.
    const { data, error } = await supabase
      .from('appointments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelAppointment(id: string, reason: string) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancel_reason: reason })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAvailability(barberId: string, date: string) {
    // Return slots or existing appointments to calculate slots in UI
    // date should be YYYY-MM-DD
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from('appointments')
      .select('starts_at, ends_at')
      .eq('barber_id', barberId)
      .neq('status', 'cancelled')
      .gte('starts_at', startOfDay)
      .lte('starts_at', endOfDay);

    if (error) throw error;
    return data;
  }
};
