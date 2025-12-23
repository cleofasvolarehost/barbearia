import { supabase } from '../lib/supabase';
import { Appointment, AppointmentFilters, CreateAppointmentPayload, AppointmentStatus } from '../types/appointments';
import { addMinutes, format, formatISO, parseISO } from 'date-fns';

export const appointmentsService = {
  async listAppointments(filters: AppointmentFilters) {
    let query = supabase
      .from('agendamentos')
      .select(
        `
          id,
          establishment_id,
          usuario_id,
          barbeiro_id,
          data,
          horario,
          status,
          preco_total,
          observacoes,
          created_at,
          barbeiro:barbeiros(id, nome, foto_url),
          usuario:usuarios(id, nome, telefone),
          servicos:agendamentos_servicos(servicos(id, nome, duracao_minutos, preco))
        `,
        { count: 'exact' }
      );

    if (filters.establishment_id) {
      query = query.eq('establishment_id', filters.establishment_id);
    }

    if (filters.dateRange) {
      const startDate = format(parseISO(filters.dateRange.start), 'yyyy-MM-dd');
      const endDate = format(parseISO(filters.dateRange.end), 'yyyy-MM-dd');
      query = query
        .gte('data', startDate)
        .lte('data', endDate);
    }

    if (filters.status) {
      query = query.eq('status', mapStatusToDatabase(filters.status));
    }

    if (filters.barber_id) {
      query = query.eq('barbeiro_id', filters.barber_id);
    }

    if (filters.service_id) {
      query = query.eq('servicos.servicos.id', filters.service_id);
    }

    if (filters.search) {
      query = query.or(
        `usuarios.nome.ilike.%${filters.search}%,usuarios.telefone.ilike.%${filters.search}%`
      );
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query
      .order('data', { ascending: true })
      .order('horario', { ascending: true })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const mapped = (data || []).map((row: any) => mapDatabaseAppointment(row));

    return { data: mapped as Appointment[], count };
  },

  async createAppointment(payload: CreateAppointmentPayload) {
    // 1. Get service duration/price to calculate ends_at and total
    const { data: service, error: serviceError } = await supabase
      .from('servicos')
      .select('nome, duracao_minutos, preco')
      .eq('id', payload.service_id)
      .single();

    if (serviceError || !service) throw new Error('Serviço não encontrado');

    const startsAt = parseISO(payload.starts_at);
    const endsAt = addMinutes(startsAt, service.duracao_minutos);

    const appointmentDate = format(startsAt, 'yyyy-MM-dd');
    const appointmentTime = format(startsAt, 'HH:mm:ss');

    let clientId = payload.client_id;
    if (!clientId) {
      if (!payload.client_name) {
        throw new Error('Informe o nome do cliente para criar o agendamento.');
      }

      const { data: newClient, error: clientError } = await supabase
        .from('usuarios')
        .insert({
          email: `walkin-${crypto.randomUUID()}@cliente.local`,
          nome: payload.client_name,
          telefone: payload.client_phone || null,
          tipo: 'cliente'
        })
        .select('id')
        .single();

      if (clientError) throw clientError;
      clientId = newClient.id;
    }

    // 2. Check conflicts for the barber on the same day
    const { data: existingAppointments, error: conflictError } = await supabase
      .from('agendamentos')
      .select(
        `horario, servicos:agendamentos_servicos(servicos(duracao_minutos))`
      )
      .eq('barbeiro_id', payload.barber_id)
      .eq('data', appointmentDate)
      .neq('status', 'cancelado');

    if (conflictError) throw conflictError;

    const startsAtMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
    const endsAtMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();
    const hasConflict = (existingAppointments || []).some((appt: any) => {
      const [h, m] = appt.horario.split(':').map(Number);
      const startMins = h * 60 + m;
      const duration = appt.servicos?.reduce((total: number, entry: any) => {
        return total + (entry.servicos?.duracao_minutos || 0);
      }, 0) || 30;
      const endMins = startMins + duration;
      return startsAtMinutes < endMins && endsAtMinutes > startMins;
    });

    if (hasConflict) {
      throw new Error('Horário indisponível para este barbeiro.');
    }

    // 3. Create appointment
    const { data: appointment, error } = await supabase
      .from('agendamentos')
      .insert({
        establishment_id: payload.barbershop_id,
        usuario_id: clientId,
        barbeiro_id: payload.barber_id,
        data: appointmentDate,
        horario: appointmentTime,
        preco_total: service.preco || 0,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) throw error;

    const { error: serviceErrorInsert } = await supabase
      .from('agendamentos_servicos')
      .insert({
        agendamento_id: appointment.id,
        servico_id: payload.service_id
      });

    if (serviceErrorInsert) throw serviceErrorInsert;

    return appointment;
  },

  async updateAppointment(id: string, payload: Partial<Appointment>) {
    // If updating time, check conflicts again? 
    // For now, simple update.
    const updatePayload: Record<string, any> = {};

    if (payload.status) {
      updatePayload.status = mapStatusToDatabase(payload.status);
    }

    if (payload.starts_at) {
      const startsAt = parseISO(payload.starts_at);
      updatePayload.data = format(startsAt, 'yyyy-MM-dd');
      updatePayload.horario = format(startsAt, 'HH:mm:ss');
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelAppointment(id: string, reason: string) {
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado', observacoes: reason })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAvailability(barberId: string, date: string) {
    // Return slots or existing appointments to calculate slots in UI
    // date should be YYYY-MM-DD
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`data, horario, servicos:agendamentos_servicos(servicos(duracao_minutos))`)
      .eq('barbeiro_id', barberId)
      .neq('status', 'cancelado')
      .eq('data', date);

    if (error) throw error;
    const mapped = (data || []).map((appointment: any) => {
      const startsAt = parseISO(`${appointment.data}T${appointment.horario}`);
      const duration = appointment.servicos?.reduce((total: number, entry: any) => {
        return total + (entry.servicos?.duracao_minutos || 0);
      }, 0) || 30;
      const endsAt = addMinutes(startsAt, duration);
      return {
        starts_at: formatISO(startsAt),
        ends_at: formatISO(endsAt)
      };
    });
    return mapped;
  }
};

const statusMapToDatabase: Record<AppointmentStatus, string> = {
  scheduled: 'pendente',
  confirmed: 'confirmado',
  cancelled: 'cancelado',
  completed: 'concluido',
  no_show: 'no_show'
};

const statusMapToUi: Record<string, AppointmentStatus> = {
  pendente: 'scheduled',
  confirmado: 'confirmed',
  cancelado: 'cancelled',
  concluido: 'completed',
  no_show: 'no_show'
};

const mapStatusToDatabase = (status: AppointmentStatus) => {
  return statusMapToDatabase[status] ?? status;
};

const mapStatusToUi = (status: string) => {
  return statusMapToUi[status] ?? (status as AppointmentStatus);
};

const mapDatabaseAppointment = (row: any): Appointment => {
  const startIso = `${row.data}T${row.horario}`;
  const startsAt = parseISO(startIso);
  const services = row.servicos || [];
  const serviceDuration = services.reduce((total: number, entry: any) => {
    return total + (entry.servicos?.duracao_minutos || 0);
  }, 0) || 30;
  const endsAt = addMinutes(startsAt, serviceDuration);
  const serviceNames = services
    .map((entry: any) => entry.servicos?.nome)
    .filter(Boolean)
    .join(', ');
  const firstService = services[0]?.servicos;

  return {
    id: row.id,
    barbershop_id: row.establishment_id,
    client_id: row.usuario_id,
    client_name: row.usuario?.nome,
    client_phone: row.usuario?.telefone,
    service_id: firstService?.id || '',
    service_name: serviceNames || firstService?.nome,
    barber_id: row.barbeiro_id,
    starts_at: formatISO(startsAt),
    ends_at: formatISO(endsAt),
    status: mapStatusToUi(row.status),
    cancel_reason: row.observacoes || undefined,
    created_at: row.created_at,
    updated_at: row.created_at,
    barber: row.barbeiro
      ? {
          id: row.barbeiro.id,
          nome: row.barbeiro.nome,
          foto_url: row.barbeiro.foto_url
        }
      : undefined,
    service: firstService
      ? {
          id: firstService.id,
          nome: firstService.nome,
          duration_min: firstService.duracao_minutos,
          preco: firstService.preco
        }
      : undefined,
    client: row.usuario
      ? {
          id: row.usuario.id,
          full_name: row.usuario.nome,
          phone: row.usuario.telefone,
          avatar_url: null
        }
      : undefined
  };
};
