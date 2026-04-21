-- ======================================================================
-- SCRIPT MAESTRO DE ESTABILIZACIÓN - AUSTRALMARKET
-- Este script unifica y corrige toda la estructura de la base de datos.
-- ======================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES (Corregida y Extendida)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  first_name text,
  last_name text,
  phone text,
  rut text,
  role text default 'customer' check (role in ('admin', 'manager', 'cashier', 'warehouse', 'customer', 'developer')),
  current_area text default 'Inactivo',
  loyalty_points integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  description text,
  price integer not null,
  stock integer default 0,
  image text,
  category_id uuid references public.categories(id),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABLA DE TERMINALES (Puntos de Venta)
CREATE TABLE IF NOT EXISTS public.terminals (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  status text default 'active' check (status in ('active', 'maintenance', 'inactive')),
  last_ip text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TABLA DE SESIONES DE CAJA (Cash Sessions)
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid default uuid_generate_v4() primary key,
  terminal_id uuid references public.terminals(id),
  cashier_id uuid references public.profiles(id),
  cashier_name text, -- Para redundancia rápida
  status text default 'open' check (status in ('open', 'closed')),
  opening_amount integer default 0,
  closing_amount integer,
  opened_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone,
  notes text
);

-- 7. TABLA DE ÓRDENES (Ventas)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id), -- Puede ser null para ventas anónimas en POS
  cash_session_id uuid references public.cash_sessions(id),
  total integer not null,
  payment_method text check (payment_method in ('efectivo', 'tarjeta', 'transferencia')),
  status text default 'completed' check (status in ('pending', 'completed', 'cancelled')),
  type text default 'online' check (type in ('online', 'pos')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. TABLA DE ITEMS DE ORDEN
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity integer not null,
  price_at_sale integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. CONFIGURACIÓN DE SEGURIDAD (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA PROFILES
DROP POLICY IF EXISTS "admin_total" ON public.profiles;
CREATE POLICY "admin_total" ON public.profiles FOR ALL USING ( (auth.jwt() ->> 'role') = 'admin' );

DROP POLICY IF EXISTS "manager_profile_access" ON public.profiles;
CREATE POLICY "manager_profile_access" ON public.profiles FOR ALL USING ( (auth.jwt() ->> 'role') = 'manager' );

DROP POLICY IF EXISTS "self_access" ON public.profiles;
CREATE POLICY "self_access" ON public.profiles FOR ALL USING ( auth.uid() = id );

-- POLÍTICAS PARA CASH SESSIONS (EL MANAGER PUEDE CERRAR CUALQUIERA)
DROP POLICY IF EXISTS "manager_cash_total" ON public.cash_sessions;
CREATE POLICY "manager_cash_total" ON public.cash_sessions FOR ALL USING ( (auth.jwt() ->> 'role') in ('admin', 'manager') );

DROP POLICY IF EXISTS "cashier_own_session" ON public.cash_sessions;
CREATE POLICY "cashier_own_session" ON public.cash_sessions FOR ALL USING ( auth.uid() = cashier_id );

-- POLÍTICAS GENERALES DE LECTURA
DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories FOR SELECT USING (true);

-- 10. FUNCIÓN PARA CREACIÓN AUTOMÁTICA DE PERFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'given_name',
      'Usuario Registrado'
    ),
    COALESCE(new.raw_user_meta_data->>'family_name', ''),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. SINCRONIZAR USUARIOS EXISTENTES
INSERT INTO public.profiles (id, email, first_name, role, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(
      raw_user_meta_data->>'full_name', 
      raw_user_meta_data->>'name', 
      raw_user_meta_data->>'given_name',
      'Usuario Migrado'
    ),
    'customer',
    now()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(profiles.role, 'customer'),
    updated_at = now();
