-- Multi-Tenancy Architecture: Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    tier text DEFAULT 'basico' CHECK (tier IN ('basico', 'plus', 'elite')),
    is_active boolean DEFAULT true,
    merchant_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Update store_settings to support multiple stores
-- Note: We might want to migrate existing data later, for now we ensure the column exists
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Ensure profiles have a store_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- RLS for Stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Developers can manage all stores" ON public.stores;
CREATE POLICY "Developers can manage all stores" ON public.stores 
FOR ALL USING ( (auth.jwt() ->> 'role') = 'developer' );

DROP POLICY IF EXISTS "Public read active stores" ON public.stores;
CREATE POLICY "Public read active stores" ON public.stores 
FOR SELECT USING ( is_active = true );
