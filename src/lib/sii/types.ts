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
}

export interface DteHeader {
  TipoDTE: 39 | 41; // 39: Boleta, 41: Boleta Exenta
  Folio: number;
  FchEmis: string; // AAAA-MM-DD
  IndServicio?: 3; // 3 para Boletas de productos
  MntTotal: number;
  MntNeto?: number;
  IVA?: number;
  MntExe?: number;
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
