import { supabase } from './supabase';
import { addMinutes, parse, format, isBefore, isAfter, isWithinInterval, startOfDay, isSameDay } from 'date-fns';

interface ScheduleConfig {
    workHours: { start: string; end: string };
    lunchBreak: { start: string; end: string };
}

interface Appointment {
    horario: string; // "09:00:00"
    servico: {
        duracao_minutos: number;
    };
}

export async function getAvailableSlots(
    barberId: string,
    date: Date,
    serviceDuration: number,
    slotInterval: number = 30,
    scheduleConfig?: ScheduleConfig
): Promise<string[]> {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 1. Fetch existing appointments via RPC
    const { data: appointments } = await supabase
        .rpc('get_barber_appointments', {
            p_barber_id: barberId,
            p_date: dateStr
        });

    // 2. Parse Schedule
    const startWork = parse(scheduleConfig?.workHours.start || '09:00', 'HH:mm', date);
    const endWork = parse(scheduleConfig?.workHours.end || '19:00', 'HH:mm', date);
    const startLunch = parse(scheduleConfig?.lunchBreak.start || '12:00', 'HH:mm', date);
    const endLunch = parse(scheduleConfig?.lunchBreak.end || '13:00', 'HH:mm', date);

    // 3. Generate Slots
    const slots: string[] = [];
    let currentSlot = startWork;

    const now = new Date();
    const isToday = isSameDay(date, now);

    while (isBefore(currentSlot, endWork)) {
        // Check if slot + duration fits before end of work
        const slotEnd = addMinutes(currentSlot, serviceDuration);
        
        if (isAfter(slotEnd, endWork)) {
            break; 
        }

        // Rule 1: Not in the past (if today)
        // Add a small buffer (e.g. 15 min) so users don't book "now"
        if (isToday && isBefore(currentSlot, addMinutes(now, 15))) {
            currentSlot = addMinutes(currentSlot, slotInterval);
            continue;
        }

        // Rule 2: Not overlapping Lunch
        const collisionLunch = (currentSlot < endLunch) && (slotEnd > startLunch);

        if (collisionLunch) {
            currentSlot = addMinutes(currentSlot, slotInterval);
            continue;
        }

        // Rule 3: Not overlapping Existing Appointments
        let collisionAppointment = false;
        if (appointments) {
            for (const app of appointments) {
                // app.start_time is "HH:mm:ss"
                const appStart = parse(app.start_time, 'HH:mm:ss', date);
                const appDuration = app.duration; 
                const appEnd = addMinutes(appStart, appDuration);

                // Check collision
                if ((currentSlot < appEnd) && (slotEnd > appStart)) {
                    collisionAppointment = true;
                    break;
                }
            }
        }

        if (!collisionAppointment) {
            slots.push(format(currentSlot, 'HH:mm'));
        }

        // Move to next slot
        currentSlot = addMinutes(currentSlot, slotInterval);
    }

    return slots;
}
