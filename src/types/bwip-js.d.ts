/**
 * Declaracion minima de `bwip-js`.
 *
 * El paquete (4.11.4) solo expone tipos por condicion (`browser`, `node`,
 * `react-native`, `electron`) y no en el entry raiz, asi que con
 * `moduleResolution: bundler` TypeScript no encuentra las declaraciones.
 * Declaramos aqui lo unico que usa el motor: el encoder PDF417.
 */
declare module 'bwip-js' {
  export interface RenderOptions {
    bcid: string;
    text: string;
    binarytext?: boolean;
    scale?: number;
    height?: number;
    width?: number;
    columns?: number;
    ecclevel?: number;
    paddingwidth?: number;
    paddingheight?: number;
    backgroundcolor?: string;
  }

  export function toBuffer(opts: RenderOptions): Promise<Buffer>;
}
