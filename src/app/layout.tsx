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
import { ThemeProvider } from "@/providers/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${outfit.variable} min-h-screen flex flex-col antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SaaSProvider>
            <SessionSync />
            {children}
          </SaaSProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
