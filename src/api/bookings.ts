import { supabase } from '../lib/supabase';
import { sendWhatsApp } from '../lib/wordnet';
import { format, parseISO } from 'date-fns';

interface CreateBookingParams {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  barberId: string;
  serviceId: string;
  userId: string;
  price: number;
  // WhatsApp Context
  shopConfig?: any;
  clientPhone?: string;
  clientName?: string;
}

export const bookingsApi = {
  /**
   * Creates a booking securely using Server-Side RPC logic.
   * Handles Double-Booking prevention and WhatsApp notification.
   */
  create: async (params: CreateBookingParams) => {
    try {
      console.log('API: Creating booking...', params);

      // 1. Call RPC (Atomic Database Transaction)
      const { data, error } = await supabase.rpc('create_booking', {
        p_data: params.date,
        p_horario: params.time + ':00', // Ensure time format HH:mm:ss
        p_barbeiro_id: params.barberId,
        p_servico_id: params.serviceId,
        p_usuario_id: params.userId,
        p_preco: params.price
      });

      if (error) throw error;
      if (!data.success) {
        throw new Error(data.message || 'Erro ao agendar');
      }

      const bookingId = data.id;

      // 2. Trigger WhatsApp (Only if DB success)
      if (params.shopConfig?.is_active && params.clientPhone) {
        // Run async (don't block return)
        bookingsApi.sendNotification(params, bookingId).catch(console.error);
      }

      return { success: true, id: bookingId };

    } catch (error: any) {
      console.error('API Error:', error);
      return { success: false, message: error.message };
    }
  },

  sendNotification: async (params: CreateBookingParams, bookingId: string) => {
    const config = params.shopConfig;
    let msg = config.templates?.reminder || 'Olá {nome}, seu agendamento foi confirmado para {horario}.';
    
    msg = msg.replace('{nome}', params.clientName || 'Cliente');
    msg = msg.replace('{horario}', `${format(parseISO(params.date), 'dd/MM')} às ${params.time}`);
    
    await sendWhatsApp({
        to: params.clientPhone!,
        message: msg,
        instanceId: config.instance_id,
        token: config.api_token
    });
  }
};
