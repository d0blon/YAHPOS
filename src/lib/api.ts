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

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(branchId?: string, category?: string, search?: string): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (branchId) params.set('branch_id', branchId);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString();
    const data = await apiFetch(`/products${qs ? `?${qs}` : ''}`);
    return Array.isArray(data) ? data : (data?.products ?? []);
  } catch (err) {
    console.error('[getProducts] Error al obtener productos de Supabase:', err);
    throw err;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await apiFetch(`/products?slug=${encodeURIComponent(slug)}`);
  } catch (err) {
    console.warn(`[getProductBySlug] Error al obtener producto con slug ${slug}:`, err);
    return null;
  }
}

export async function getBranches(): Promise<any[]> {
  try {
    return await apiFetch('/branches');
  } catch (err) {
    console.warn('[getBranches] Error buscando sucursales:', err);
    return [];
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
  return await apiFetch('/sii', {
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
