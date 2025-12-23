-- Insert default SaaS settings if they don't exist
INSERT INTO public.saas_settings (setting_key, setting_value, is_active)
VALUES 
  ('manual_pix_key', '000.000.000-00', true),
  ('mp_access_token', 'TEST-ACCESS-TOKEN', true),
  ('mp_public_key', 'TEST-PUBLIC-KEY', true)
ON CONFLICT (setting_key) DO NOTHING;
