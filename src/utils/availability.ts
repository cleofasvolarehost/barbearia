import { supabase } from '../lib/supabase';
import { addMinutes, format, parse, isBefore, startOfDay, endOfDay } from 'date-fns';

interface Interval {
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
}

export async function getAvailableSlots(
  date: string, // YYYY-MM-DD
  barberId: string,
  serviceDuration: number,
  shopOpenHour: string = '09:00',
  shopCloseHour: string = '19:00',
  slotInterval: number = 30
) {
  try {
    const startOfDayDate = startOfDay(new Date(date));
    const endOfDayDate = endOfDay(new Date(date));

    // 1. Fetch Appointments
    const { data: appointments, error: apptError } = await supabase
      .from('agendamentos')
      .select('horario, servicos:agendamentos_servicos(servicos(duracao_minutos))')
      .eq('barbeiro_id', barberId)
      .eq('data', date)
      .neq('status', 'cancelado');

    if (apptError) throw apptError;

    // 2. Fetch Overrides
    const { data: overrides, error: overrideError } = await supabase
      .from('schedule_overrides')
      .select('start_time, end_time, type')
      .eq('barber_id', barberId)
      .gte('start_time', startOfDayDate.toISOString())
      .lte('end_time', endOfDayDate.toISOString());

    if (overrideError) {
        // If 404 or missing table/column, ignore overrides for now
        // console.error('Error fetching overrides:', overrideError);
    } 

    // 3. Convert everything to busy intervals (minutes from midnight)
    const busyIntervals: Interval[] = [];

    // Appointments to Intervals
    appointments?.forEach((appt: any) => {
      const [h, m] = appt.horario.split(':').map(Number);
      const startMins = h * 60 + m;
      const duration = appt.servicos?.[0]?.servicos?.duracao_minutos || 30;
      busyIntervals.push({ start: startMins, end: startMins + duration });
    });

    if (!overrideError) {
        // Overrides to Intervals
        overrides?.forEach((override: any) => {
        const start = new Date(override.start_time);
        const end = new Date(override.end_time);
        
        const startMins = start.getHours() * 60 + start.getMinutes();
        const endMins = end.getHours() * 60 + end.getMinutes();

        // Handle full day
        if (override.type === 'full_day') {
            busyIntervals.push({ start: 0, end: 24 * 60 });
        } else {
            busyIntervals.push({ start: startMins, end: endMins });
        }
        });
    }

    // 4. Generate Slots
    const [openH, openM] = shopOpenHour.split(':').map(Number);
    const [closeH, closeM] = shopCloseHour.split(':').map(Number);
    
    const shopOpenMins = openH * 60 + openM;
    const shopCloseMins = closeH * 60 + closeM;

    const slots: { time: string; label: string; available: boolean }[] = [];
    
    // Helper to check collision
    const isColliding = (start: number, end: number) => {
      return busyIntervals.some(interval => {
        return (start < interval.end) && (end > interval.start);
      });
    };

    for (let time = shopOpenMins; time < shopCloseMins; time += slotInterval) {
      const currentSlotEnd = time + serviceDuration;
      
      if (currentSlotEnd > shopCloseMins) continue;

      const available = !isColliding(time, currentSlotEnd);
      
      // Filter past times if today
      let isPast = false;
      const now = new Date();
      if (date === format(now, 'yyyy-MM-dd')) {
        const nowMins = now.getHours() * 60 + now.getMinutes();
        if (time < nowMins) isPast = true;
      }

      if (available && !isPast) {
        const h = Math.floor(time / 60);
        const m = time % 60;
        const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        slots.push({
          time: timeString, // HH:mm
          label: timeString,
          available: true
        });
      }
    }

    return slots.map(s => s.time);

  } catch (error) {
    console.error('Error calculating availability:', error);
    return [];
  }
}
