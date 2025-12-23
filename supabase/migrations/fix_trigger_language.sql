CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, telefone, tipo)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome', 'Usuário'),
    new.raw_user_meta_data->>'telefone',
    'client' -- Enforce 'client' role by default (English)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
