import { Database } from './supabase';

export type User = Database['public']['Tables']['usuarios']['Row'];
export type Service = Database['public']['Tables']['servicos']['Row'];
// Extend Barber type manually since types are not auto-regenerated
export type Barber = Database['public']['Tables']['barbeiros']['Row'] & {
    work_days?: number[];
    work_hours_start?: string;
    work_hours_end?: string;
    establishment_id?: string | null;
    schedule_config?: {
        workHours: { start: string; end: string };
        lunchBreak: { start: string; end: string };
    };
};
export type Appointment = Database['public']['Tables']['agendamentos']['Row'];
export type AppointmentService = Database['public']['Tables']['agendamentos_servicos']['Row'];

// New Commission Type
export interface Commission {
  id: string;
  agendamento_id: string;
  barbeiro_id: string;
  valor_comissao: number;
  percentual_aplicado: number;
  data_geracao: string;
  status: 'pendente' | 'pago';
}

export interface Establishment {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url?: string;
  phone?: string;
  open_hour: string;
  close_hour: string;
  work_days: number[];
  primary_color: string;
  secondary_color: string;
  banner_url?: string;
  wordnet_instance_id?: string;
  wordnet_token?: string;
  whatsapp_templates?: {
      reminder: string;
      rescue: string;
      birthday?: string;
  };
  mp_access_token?: string;
  mp_public_key?: string;
  accepts_pix?: boolean;
  service_categories?: string[];
  
  // Scheduling
  slot_interval_min?: number;

  // Payment & Subscription
  manual_pix_key?: string;
  allow_pay_at_shop?: boolean;
  payment_mode?: 'checkout_transparent' | 'redirect';
  
  // SAAS Subscription
  subscription_status?: 'active' | 'trial' | 'suspended' | 'cancelled';
  subscription_end_date?: string;
  subscription_plan?: 'monthly' | 'yearly';
  
  created_at?: string;
}

export interface SaasSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  is_active: boolean;
  created_at: string;
}

export interface ShopPlan {
  id: string;
  establishment_id: string;
  name: string;
  description?: string;
  price: number;
  days_valid: number;
  max_cuts?: number;
  active: boolean;
}

export interface ClientSubscription {
  id: string;
  establishment_id: string;
  client_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}
