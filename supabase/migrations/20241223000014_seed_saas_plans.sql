
INSERT INTO public.saas_plans (name, description, price, interval_days, features, is_active, is_recommended)
SELECT 'Mensal Básico', 'Ideal para barbearias em crescimento', 97.00, 30, '["Agenda Ilimitada", "Gestão Financeira", "App do Cliente", "Suporte via WhatsApp"]'::jsonb, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Mensal Básico');

INSERT INTO public.saas_plans (name, description, price, interval_days, features, is_active, is_recommended)
SELECT 'Mensal Pro', 'Tudo que você precisa para escalar', 147.00, 30, '["Tudo do Básico", "Múltiplos Profissionais", "Campanhas de Marketing", "Relatórios Avançados", "Clube de Assinatura"]'::jsonb, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Mensal Pro');

INSERT INTO public.saas_plans (name, description, price, interval_days, features, is_active, is_recommended)
SELECT 'Anual Pro', 'Economize com o plano anual', 1470.00, 365, '["Todos os recursos Pro", "2 meses grátis", "Setup acompanhado", "Prioridade no Suporte"]'::jsonb, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE name = 'Anual Pro');
