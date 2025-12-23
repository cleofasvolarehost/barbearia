import { supabase } from '../lib/supabase';
import { Appointment, AppointmentFilters, CreateAppointmentPayload, AppointmentStatus } from '../types/appointments';
import { addMinutes, formatISO, parseISO } from 'date-fns';

export const appointmentsService = {
  async listAppointments(filters: AppointmentFilters) {
    // Temporary: Query 'agendamentos' table instead of 'appointments' until migration is complete
    let query = supabase
      .from('agendamentos')
      .select(`
        id,
        establishment_id,
        usuario_id,
        barbeiro_id,
        data,
        horario,
        status,
        preco_total,
        client_name,
        client_phone,
        created_at,
        barbeiro:barbeiros(id, nome, foto_url),
        client:usuarios(id, nome, telefone),
        services:agendamentos_servicos(
          servico:servicos(id, nome, duracao_minutos, preco)
        )
      `, { count: 'exact' });

    if (filters.dateRange) {
      const startDate = filters.dateRange.start.split('T')[0];
      const endDate = filters.dateRange.end.split('T')[0];
      query = query
        .gte('data', startDate)
        .lte('data', endDate);
    }

    if (filters.status) {
      const statusMapReverse: Record<string, string> = {
        'scheduled': 'pendente',
        'confirmed': 'confirmado',
        'cancelled': 'cancelado',
        'completed': 'concluido',
        'no_show': 'no_show'
      };
      const dbStatus = statusMapReverse[filters.status];
      if (dbStatus) query = query.eq('status', dbStatus);
    }

    if (filters.barber_id) {
      query = query.eq('barbeiro_id', filters.barber_id);
    }

    if (filters.barbershop_id) {
      query = query.eq('establishment_id', filters.barbershop_id);
    }

    // Note: Search implementation skipped for legacy table join complexity
    // Can be added if needed using client-side filtering or separate search query

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to).order('data', { ascending: true }).order('horario', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    const appointments: Appointment[] = (data || []).map((item: any) => {
      const service = item.services?.[0]?.servico;
      const startIso = `${item.data}T${item.horario}`;
      
      let endIso = startIso;
      if (service?.duracao_minutos) {
        const startDate = new Date(startIso);
        const endDate = addMinutes(startDate, service.duracao_minutos);
        endIso = formatISO(endDate);
      }

      const statusMap: Record<string, AppointmentStatus> = {
        'pendente': 'scheduled',
        'confirmado': 'confirmed',
        'cancelado': 'cancelled',
        'concluido': 'completed',
        'no_show': 'no_show'
      };

      return {
        id: item.id,
        barbershop_id: item.establishment_id,
        client_id: item.usuario_id,
        client_name: item.client?.nome || item.client_name,
        client_phone: item.client?.telefone || item.client_phone,
        service_id: service?.id,
        service_name: service?.nome,
        barber_id: item.barbeiro_id,
        starts_at: startIso,
        ends_at: endIso,
        status: statusMap[item.status] || 'scheduled',
        created_by: null,
        created_at: item.created_at,
        updated_at: item.created_at,
        barber: item.barbeiro,
        service: service ? {
          id: service.id,
          nome: service.nome,
          duration_min: service.duracao_minutos,
          preco: service.preco
        } : undefined,
        client: item.client ? {
          id: item.client.id,
          full_name: item.client.nome,
          phone: item.client.telefone,
          avatar_url: null // item.client.avatar_url
        } : undefined
      };
    });

    return { data: appointments, count };
  },

  async createAppointment(payload: CreateAppointmentPayload) {
    // Get service price
    const { data: service } = await supabase
      .from('servicos')
      .select('preco')
      .eq('id', payload.service_id)
      .single();

    const dateObj = parseISO(payload.starts_at);
    const dateStr = formatISO(dateObj, { representation: 'date' });
    const timeStr = formatISO(dateObj, { representation: 'time' }).substring(0, 5);

    // Use RPC to ensure consistency
    const { data, error } = await supabase.rpc('create_booking', {
      p_data: dateStr,
      p_horario: timeStr + ':00',
      p_barbeiro_id: payload.barber_id,
      p_servico_id: payload.service_id,
      p_usuario_id: payload.client_id, // If null/undefined, RPC receives null
      p_preco: service?.preco || 0,
      p_client_name: payload.client_name,
      p_client_phone: payload.client_phone
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.message);

    return data;
  },

  async updateAppointment(id: string, payload: Partial<Appointment>) {
    const updateData: any = {};
    if (payload.status) {
       const statusMapReverse: Record<string, string> = {
        'scheduled': 'pendente',
        'confirmed': 'confirmado',
        'cancelled': 'cancelado',
        'completed': 'concluido',
        'no_show': 'no_show'
      };
      updateData.status = statusMapReverse[payload.status];
    }
    
    // Only status update supported for now in this quick fix
    const { data, error } = await supabase
      .from('agendamentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelAppointment(id: string, reason: string) {
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado', observacoes: reason }) // observacoes as cancel reason?
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAppointment(id: string) {
    // Delete related services first (just in case cascade isn't set up)
    await supabase.from('agendamentos_servicos').delete().eq('agendamento_id', id);

    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAvailability(barberId: string, date: string) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('data, horario')
      .eq('barbeiro_id', barberId)
      .neq('status', 'cancelado')
      .eq('data', date);

    if (error) throw error;
    
    // Convert to starts_at/ends_at format expected by UI
    // This is a bit tricky without service duration, but availability.ts usually handles slots.
    // The original getAvailability returned { starts_at, ends_at }.
    // Here we return existing bookings.
    
    return data.map((item: any) => ({
        starts_at: `${item.data}T${item.horario}`,
        ends_at: `${item.data}T${item.horario}` // Placeholder, real duration needed if we want exact blocks
    }));
  }
};
