-- Seed Standard SaaS Plans
INSERT INTO public.saas_plans (name, price, interval_days, description, is_active, is_recommended, features)
SELECT 'Mensal', 97.00, 30, 'Plano ideal para quem está começando.', true, false, '["Gestão Completa", "Agenda Ilimitada", "Relatórios Básicos"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Mensal');

INSERT INTO public.saas_plans (name, price, interval_days, description, is_active, is_recommended, features)
SELECT 'Trimestral', 270.00, 90, 'Economize com o plano trimestral.', true, true, '["Gestão Completa", "Agenda Ilimitada", "Relatórios Avançados", "Desconto de 7%"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Trimestral');

INSERT INTO public.saas_plans (name, price, interval_days, description, is_active, is_recommended, features)
SELECT 'Semestral', 500.00, 180, 'Maior economia para seu negócio.', true, false, '["Gestão Completa", "Agenda Ilimitada", "Relatórios Premium", "Desconto de 14%", "Suporte Prioritário"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Semestral');
