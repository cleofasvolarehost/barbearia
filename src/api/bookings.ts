import { supabase } from '../lib/supabase';
interface CreateBookingParams {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  barberId: string;
  serviceId: string;
  userId: string;
  price: number;
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

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          date: params.date,
          time: params.time,
          barberId: params.barberId,
          serviceId: params.serviceId,
          userId: params.userId,
          price: params.price,
          clientName: params.clientName,
          clientPhone: params.clientPhone
        }
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Erro ao agendar');
      }

      return { success: true, id: data.id };

    } catch (error: any) {
      console.error('API Error:', error);
      return { success: false, message: error.message };
    }
  }
};
