-- Migration to add schedule columns to barbers table
ALTER TABLE public.barbeiros 
ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS work_hours_start TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS work_hours_end TIME DEFAULT '19:00:00';
