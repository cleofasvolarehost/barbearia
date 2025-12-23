-- Update the check constraint for 'tipo' in 'usuarios' table
ALTER TABLE usuarios DROP CONSTRAINT usuarios_tipo_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_check CHECK (tipo IN ('cliente', 'admin', 'barbeiro', 'dono'));

-- Add policies for admin to view all data
CREATE POLICY "Admins can view all users" ON usuarios
    FOR SELECT USING (auth.uid() IN (SELECT id FROM usuarios WHERE tipo IN ('admin', 'dono')));

CREATE POLICY "Admins can view all appointments" ON agendamentos
    FOR SELECT USING (auth.uid() IN (SELECT id FROM usuarios WHERE tipo IN ('admin', 'dono')));

CREATE POLICY "Admins can update all appointments" ON agendamentos
    FOR UPDATE USING (auth.uid() IN (SELECT id FROM usuarios WHERE tipo IN ('admin', 'dono')));
