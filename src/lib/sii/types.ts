/**
 * Definiciones de tipos para el ecosistema DTE Chile (SII)
 */

export interface SiiConfig {
  rutEmisor: string;
  razonSocial: string;
  giro: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  codVendedor?: string;
  pfxPath?: string;
  pfxPassword?: string;
  environment: 'production' | 'certification';
  fchResol?: string;
  nroResol?: number;
}

export interface DteHeader {
  TipoDTE: 33 | 39 | 41 | 52 | 56 | 61; // 33: Factura, 39: Boleta, 41: Boleta Exenta, 52: Guía, 56: Nota Débito, 61: Nota Crédito
  Folio: number;
  FchEmis: string; // AAAA-MM-DD
  FchVenc?: string; // AAAA-MM-DD (Obligatorio para Facturas en algunos casos)
  IndServicio?: 3; // 3 para Boletas de productos
  RUTEmisor?: string; // Se llena desde config si no viene
  RUTRecep?: string; // "66666666-6" por defecto
  RznSocRecep?: string;
  GiroRecep?: string;
  DirRecep?: string;
  CmnaRecep?: string;
  CiudadRecep?: string;
  MntTotal: number;
  MntNeto?: number;
  IVA?: number;
  TasaIVA?: number; // Ejemplo: 19
  MntExe?: number;
  // Campos específicos para Guías de Despacho (DTE 52)
  TipoDespacho?: 1 | 2 | 3; // 1: Traslado, 2: Venta, 3: Entrega
  IndTraslado?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1: Operación constituye venta, 2: Ventas por efectuar, etc.
  // Referencias (Para Notas de Crédito/Débito y Guías)
  Referencias?: Array<{
    TpoDocRef: number | string;
    FolioRef: string | number;
    FchRef: string;
    CodRef?: number;
    RazonRef?: string;
  }>;
}

export interface DteDetail {
  NmbItem: string;
  QtyItem: number;
  PrcItem: number;
  MontoItem: number;
  IndExe?: 1; // 1 si el ítem es exento
}

export interface DtePayload {
  Encabezado: DteHeader;
  Detalles: DteDetail[];
}

export interface SiiAuthResponse {
  token: string;
  glosa: string;
  created_at: number;
}
