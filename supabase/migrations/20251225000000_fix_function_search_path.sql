-- Ensure all security definer/critical functions have a stable search_path

ALTER FUNCTION public.get_my_role()
SET search_path = public;

ALTER FUNCTION public.is_manager()
SET search_path = public;

ALTER FUNCTION public.create_booking(
  date,
  time without time zone,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text
)
SET search_path = public;

ALTER FUNCTION public.log_whatsapp_attempt(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
)
SET search_path = public;

ALTER FUNCTION public.create_shop_and_owner(
  text,
  text,
  text,
  text,
  text
)
SET search_path = public;

ALTER FUNCTION public.update_loyalty_points()
SET search_path = public;

ALTER FUNCTION public.redeem_loyalty_points(
  uuid,
  uuid,
  integer
)
SET search_path = public;

ALTER FUNCTION public.get_barber_appointments(
  uuid,
  date
)
SET search_path = public;

ALTER FUNCTION public.create_establishment_and_promote(
  text,
  text
)
SET search_path = public;

ALTER FUNCTION public.handle_new_user()
SET search_path = public;
