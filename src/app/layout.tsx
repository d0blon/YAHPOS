import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
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

export const viewport: Viewport = {
  themeColor: "#052e16",
};

export const metadata: Metadata = {
  title: "PatagoniaPOS | Venta Inteligente",
  description: "Plataforma avanzada de punto de venta e e-commerce para negocios locales.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PatagoniaPOS",
  },
};

import { SaaSProvider } from "@/providers/SaaSProvider";
import { SessionSync } from "@/components/auth/SessionSync";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen flex flex-col antialiased bg-background text-foreground">
        <SaaSProvider>
          <SessionSync />
          {children}
        </SaaSProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
