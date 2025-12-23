
INSERT INTO public.saas_plans (name, description, price, interval_days, features, is_active, is_recommended)
SELECT 'Teste Plano Mensal', 'Plano mensal de teste', 50.00, 30, '["Recurso 1", "Recurso 2"]'::jsonb, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Teste Plano Mensal');

INSERT INTO public.saas_plans (name, description, price, interval_days, features, is_active, is_recommended)
SELECT 'Teste Plano Trimestral', 'Plano trimestral de teste', 140.00, 90, '["Recurso 1", "Recurso 2", "Desconto Trimestral"]'::jsonb, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Teste Plano Trimestral');

INSERT INTO public.saas_plans (name, description, price, interval_days, features, is_active, is_recommended)
SELECT 'Teste Plano Anual', 'Plano anual de teste', 500.00, 365, '["Recurso 1", "Recurso 2", "Desconto Anual", "VIP"]'::jsonb, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Teste Plano Anual');
