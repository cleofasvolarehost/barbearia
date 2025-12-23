-- Ensure mp_access_token has a value (Placeholder if missing)
INSERT INTO public.saas_settings (setting_key, setting_value, is_active)
VALUES ('mp_access_token', 'TEST-ACCESS-TOKEN-PLACEHOLDER', true)
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = 'TEST-ACCESS-TOKEN-PLACEHOLDER'
WHERE saas_settings.setting_value IS NULL OR saas_settings.setting_value = '';
