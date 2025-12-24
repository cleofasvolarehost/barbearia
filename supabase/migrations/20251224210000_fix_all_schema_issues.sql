-- Fix all schema and permission issues

-- 1. Ensure 'preco' column exists in 'agendamentos_servicos'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'agendamentos_servicos'
        AND column_name = 'preco'
    ) THEN
        ALTER TABLE public.agendamentos_servicos ADD COLUMN preco DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Fix is_super_admin recursion by ensuring SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- This runs as the function creator (postgres), bypassing RLS
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  ) INTO _is_admin;
  
  RETURN COALESCE(_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix RLS on 'usuarios' to prevent recursion
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Super Admin sees all" ON public.usuarios;
DROP POLICY IF EXISTS "Public read access" ON public.usuarios;

-- Policy for users to read their own data
CREATE POLICY "Users can read own data" ON public.usuarios
FOR SELECT USING (
  auth.uid() = id
);

-- Policy for users to update their own data
CREATE POLICY "Users can update own data" ON public.usuarios
FOR UPDATE USING (
  auth.uid() = id
);

-- Policy for Super Admin to see all (uses the SECURITY DEFINER function)
CREATE POLICY "Super Admin sees all" ON public.usuarios
FOR ALL USING (
  public.is_super_admin()
);

-- 4. Fix RLS on 'agendamentos' just in case
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
CREATE POLICY "Super Admin sees all" ON public.agendamentos
FOR ALL USING (public.is_super_admin());

-- 5. Ensure create_booking RPC is correct and handles preco
CREATE OR REPLACE FUNCTION create_booking(
    p_data DATE,
    p_horario TIME,
    p_barbeiro_id UUID,
    p_servico_id UUID,
    p_usuario_id UUID,
    p_preco DECIMAL,
    p_client_name TEXT DEFAULT NULL,
    p_client_phone TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_agendamento_id UUID;
    v_conflict_count INTEGER;
BEGIN
    -- 1. Check Availability
    SELECT COUNT(*) INTO v_conflict_count
    FROM agendamentos
    WHERE data = p_data 
      AND horario = p_horario 
      AND barbeiro_id = p_barbeiro_id
      AND status NOT IN ('cancelado', 'recusado');

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Horário indisponível');
    END IF;

    -- 2. Insert Appointment
    INSERT INTO agendamentos (data, horario, barbeiro_id, usuario_id, status, preco_total, client_name, client_phone)
    VALUES (p_data, p_horario, p_barbeiro_id, p_usuario_id, 'pendente', p_preco, p_client_name, p_client_phone)
    RETURNING id INTO v_agendamento_id;

    -- 3. Link Service
    INSERT INTO agendamentos_servicos (agendamento_id, servico_id, preco)
    VALUES (v_agendamento_id, p_servico_id, p_preco);

    RETURN jsonb_build_object('success', true, 'id', v_agendamento_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
