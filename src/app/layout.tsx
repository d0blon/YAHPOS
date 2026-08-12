import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "YAHPOS! | Punto de Venta Inteligente",
  description: "El sistema de punto de venta más rápido y premium de Chile. Gestión total, integración SII y diseño de vanguardia.",
  icons: {
    icon: [
      { url: "/logos/yahpos_logo_square_master_32.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/yahpos_logo_square_master_48.png", sizes: "48x48", type: "image/png" },
      { url: "/logos/yahpos_logo_square_master_192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/logos/yahpos_logo_square_master_180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YAHPOS!",
  },
};

import AppProviders from "@/providers/AppProviders";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SessionSync } from "@/components/auth/SessionSync";
import { PwaManager } from "@/components/pos/PwaManager";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const storeId = headersList.get("x-store-id");
  const storeTier = headersList.get("x-store-tier") as any;
  const storeName = headersList.get("x-store-name");
  const storePrimaryColor = headersList.get("x-store-primary-color");
  const storeAccentColor = headersList.get("x-store-accent-color");
  const storeSurfaceColor = headersList.get("x-store-surface-color");

  const initialConfig = storeId ? {
    id: storeId,
    tier: storeTier || 'austral',
    store_name: storeName || 'YAHPOS!',
    appearance_primary_color: storePrimaryColor || '#4b0082',
    accent_color: storeAccentColor || '#FFD100',
    surface_color: storeSurfaceColor || null,
  } : null;

  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${sora.variable} ${dmSans.variable} min-h-screen flex flex-col antialiased bg-background text-foreground relative`}>
        <div className="noise-overlay" />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AppProviders initialStoreId={storeId} initialConfig={initialConfig}>
            <SessionSync />
            {children}
          </AppProviders>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
        <PwaManager storeId={storeId} />
      </body>
    </html>
  );
}
