import type { Product } from '@/types';

// ─── API Base ─────────────────────────────────────────────────────────────────
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // Browser utilizes relative URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`; // Node.js SSR needs absolute URL
};

export const API_BASE_URL = `${getBaseUrl()}/api`;

export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Error API - Status ${res.status}`);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (error) {
    console.error(`[apiFetch] Error en ${url}:`, error);
    throw error;
  }
}

// ─── Fallback Mock ────────────────────────────────────────────────────────────
// Se usa SOLO si Supabase no responde (modo local sin internet)
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Leche Entera Colun 1L',
    slug: 'leche-entera-colun-1l',
    description: 'Leche entera de vaca, natural de Chile.',
    price: 1290,
    image: 'https://images.unsplash.com/photo-1563636619-e910ef2a844b?w=500&q=80',
    category: { id: '1', name: 'Lácteos', slug: 'lacteos', isActive: true, order: 1 },
    categoryId: '1',
    stock: 100,
    lowStockThreshold: 10,
    sku: 'LCH-001',
    unit: 'un',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Pan Marraqueta 1kg',
    slug: 'pan-marraqueta-1kg',
    description: 'Pan tradicional chileno recién horneado.',
    price: 1980,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80',
    category: { id: '2', name: 'Panadería', slug: 'panaderia', isActive: true, order: 2 },
    categoryId: '2',
    stock: 50,
    lowStockThreshold: 5,
    sku: 'PAN-001',
    unit: 'kg',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Arroz Grano Largo Tucapel 1kg',
    slug: 'arroz-tucapel-1kg',
    description: 'Arroz de grano largo, calidad superior.',
    price: 1850,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
    category: { id: '3', name: 'Abarrotes', slug: 'abarrotes', isActive: true, order: 3 },
    categoryId: '3',
    stock: 200,
    lowStockThreshold: 15,
    sku: 'ARZ-001',
    unit: 'un',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Coca-Cola Original 2.5L',
    slug: 'coca-cola-2-5l',
    description: 'Bebida gaseosa refrescante.',
    price: 2490,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
    category: { id: '4', name: 'Bebidas', slug: 'bebidas', isActive: true, order: 4 },
    categoryId: '4',
    stock: 150,
    lowStockThreshold: 12,
    sku: 'BEB-001',
    unit: 'un',
    isActive: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Detergente Líquido Omo 3L',
    slug: 'detergente-omo-3l',
    description: 'Detergente para ropa blanca y color.',
    price: 8990,
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80',
    category: { id: '5', name: 'Limpieza', slug: 'limpieza', isActive: true, order: 5 },
    categoryId: '5',
    stock: 80,
    lowStockThreshold: 8,
    sku: 'LIM-001',
    unit: 'un',
    isActive: true,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  try {
    const data = await apiFetch('/products');
    return Array.isArray(data) ? data : (data?.products ?? MOCK_PRODUCTS);
  } catch (err) {
    console.warn('[getProducts] Usando datos mock (Supabase no disponible):', err);
    return MOCK_PRODUCTS;
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function createOrder(orderData: any) {
  return await apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function createWebpayTransaction(data: any) {
  return await apiFetch('/payments/webpay/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── DTE / SII ────────────────────────────────────────────────────────────────
export async function generateElectronicBoleta(data: any) {
  return await apiFetch('/dte/boleta', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Customers / CRM ──────────────────────────────────────────────────────────
export async function getCustomerByRut(rut: string) {
  try {
    const data = await apiFetch(`/customers?rut=${encodeURIComponent(rut)}`);
    return data;
  } catch (err) {
    console.warn('[getCustomerByRut] Error buscando cliente:', err);
    return null;
  }
}
