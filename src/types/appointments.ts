export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  id: string;
  barbershop_id: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  service_id: string;
  service_name?: string;
  barber_id: string;
  starts_at: string; // ISO string
  ends_at: string; // ISO string
  status: AppointmentStatus;
  cancel_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joins
  barber?: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  service?: {
    id: string;
    nome: string;
    duration_min: number;
    preco: number;
  };
  client?: {
    id: string;
    full_name: string;
    phone: string;
    avatar_url: string | null;
  };
}

export interface CreateAppointmentPayload {
  barbershop_id: string;
  client_id?: string; // if registered
  client_name?: string; // if walk-in
  client_phone?: string; // if walk-in
  service_id: string;
  barber_id: string;
  starts_at: string;
}

export interface AppointmentFilters {
  establishment_id?: string;
  dateRange?: { start: string; end: string }; // ISO dates
  status?: AppointmentStatus;
  barber_id?: string;
  service_id?: string;
  search?: string; // name or phone
  page?: number;
  limit?: number;
}
