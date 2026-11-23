import type { NextConfig } from "next";
import withPWA, { runtimeCaching as defaultRuntimeCaching } from "@ducanh2912/next-pwa";
import { loadEnvConfig } from "@next/env";
import { assertEnv } from "./src/lib/env";

// Next evalúa next.config.ts ANTES de cargar .env* en algunos flujos; forzamos
// la carga para que la validación de build vea los mismos valores que la app.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Falla el build si faltan variables públicas obligatorias (las secretas se
// exigen recién al arrancar el servidor: src/instrumentation.ts).
assertEnv({ phase: "build" });

const isProd = process.env.NODE_ENV === 'production';

// La CSP se emite por request en src/proxy.ts (nonce real). No publicar acá una
// CSP estática: dos headers CSP se intersecan y el 'unsafe-inline' anularía el nonce.

// next-pwa 10.2.9: workboxOptions.runtimeCaching reemplaza el array por defecto
// cuando extendDefaultRuntimeCaching es false. Allowlist por cacheName para que
// reglas nuevas del paquete (apis, pages-rsc, pages, ...) no se cuelen solas.
// cacheStartUrl/dynamicStartUrl se desactivan: inyectan "start-url" y precachean
// el HTML del tenant fuera de runtimeCaching.
const STATIC_ASSET_CACHE_NAMES = new Set([
  'google-fonts-webfonts',
  'google-fonts-stylesheets',
  'static-font-assets',
  'static-image-assets',
  'next-static-js-assets',
  'next-image',
  'static-audio-assets',
  'static-video-assets',
  'static-js-assets',
  'static-style-assets',
]);

const staticAssetRuntimeCaching = defaultRuntimeCaching.filter((rule) => {
  const cacheName = rule.options?.cacheName;
  return typeof cacheName === 'string' && STATIC_ASSET_CACHE_NAMES.has(cacheName);
});

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.jumbo.cl' },
      { protocol: 'https', hostname: 'jumbo.vteximg.com.br' },
      { protocol: 'https', hostname: 'cugat.cl' },
      { protocol: 'https', hostname: '*.cugat.cl' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '*.placehold.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          ...(isProd
            ? [{
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
              }]
            : []),
        ],
      },
    ];
  },
  outputFileTracingRoot: process.cwd(),
};

export default isProd
  ? withPWA({
      dest: "public",
      register: false,
      cacheStartUrl: false,
      dynamicStartUrl: false,
      cacheOnFrontEndNav: false,
      extendDefaultRuntimeCaching: false,
      workboxOptions: {
        runtimeCaching: staticAssetRuntimeCaching,
      },
    })(nextConfig)
  : nextConfig;
