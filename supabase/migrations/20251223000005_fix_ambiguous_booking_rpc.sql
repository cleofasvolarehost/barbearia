-- Drop the old version of create_booking that causes ambiguity
-- The error reported was: Could not choose the best candidate function between ...
-- This removes the 6-argument version so only the 8-argument version (with defaults) remains.

DROP FUNCTION IF EXISTS public.create_booking(date, time without time zone, uuid, uuid, uuid, numeric);
