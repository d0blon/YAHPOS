-- 1. Asegurar que cash_sessions tenga user_id para vinculación fuerte
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Crear tabla de borradores (Drafts) para persistencia de carrito y ventas suspendidas
CREATE TABLE IF NOT EXISTS pos_drafts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    cart_data JSONB DEFAULT '[]'::jsonb,
    suspended_orders_data JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- 3. Habilitar RLS (Seguridad a nivel de fila)
ALTER TABLE pos_drafts ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso para pos_drafts
CREATE POLICY "Users can manage their own drafts" ON pos_drafts
    FOR ALL USING (auth.uid() = user_id);

-- 5. Índices para velocidad
CREATE INDEX IF NOT EXISTS idx_pos_drafts_user_session ON pos_drafts(user_id, session_id);
