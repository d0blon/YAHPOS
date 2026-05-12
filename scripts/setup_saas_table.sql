-- SaaS Architecture: Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
    tier text DEFAULT 'basico' CHECK (tier IN ('basico', 'plus', 'elite')),
    store_name text DEFAULT 'YAHPOS!',
    store_logo text,
    white_label_enabled boolean DEFAULT false,
    accent_color text DEFAULT '#003399',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert initial settings if not exists
INSERT INTO public.store_settings (id, tier, store_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'basico', 'YAHPOS!')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admin/developer update" ON public.store_settings;
CREATE POLICY "Only admin/developer update" ON public.store_settings FOR UPDATE USING ( (auth.jwt() ->> 'role') in ('admin', 'developer') );
