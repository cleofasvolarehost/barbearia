-- Drop existing table to ensure schema match
DROP TABLE IF EXISTS appointments CASCADE;

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES establishments(id) NOT NULL,
  client_id UUID REFERENCES profiles(id), -- nullable, for registered users
  client_name TEXT, -- for walk-ins
  client_phone TEXT, -- for walk-ins
  service_id UUID REFERENCES servicos(id) NOT NULL,
  service_name TEXT, -- snapshot
  barber_id UUID REFERENCES barbeiros(id) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'scheduled',
  cancel_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_appointments_barbershop_starts_at ON appointments(barbershop_id, starts_at);
CREATE INDEX idx_appointments_barber_starts_at ON appointments(barber_id, starts_at);
CREATE INDEX idx_appointments_status_starts_at ON appointments(status, starts_at);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin (Owner) can do everything for their barbershop
CREATE POLICY "Admins can view all appointments for their barbershop"
  ON appointments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT owner_id FROM establishments WHERE id = appointments.barbershop_id
    )
  );

CREATE POLICY "Admins can insert appointments for their barbershop"
  ON appointments
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM establishments WHERE id = appointments.barbershop_id
    )
  );

CREATE POLICY "Admins can update appointments for their barbershop"
  ON appointments
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM establishments WHERE id = appointments.barbershop_id
    )
  );

-- Barbers can view their own appointments
CREATE POLICY "Barbers can view their own appointments"
  ON appointments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM barbeiros WHERE id = appointments.barber_id
    )
  );

-- Barbers can update their own appointments
CREATE POLICY "Barbers can update their own appointments"
  ON appointments
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM barbeiros WHERE id = appointments.barber_id
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO service_role;
