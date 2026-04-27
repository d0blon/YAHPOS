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
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Austral Market | Experiencia Elite",
  description: "Plataforma avanzada de e-commerce con una experiencia de usuario premium y sofisticada.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Austral Market",
  },
};

import { SaaSProvider } from "@/providers/SaaSProvider";
import { SessionSync } from "@/components/auth/SessionSync";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { EditorProvider } from "@/providers/EditorProvider";
import { EditorToggle } from "@/components/editor/EditorToggle";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${outfit.variable} min-h-screen flex flex-col antialiased bg-background text-foreground relative`}>
        <div className="noise-overlay" />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SaaSProvider>
            <EditorProvider>
              <SessionSync />
              {children}
              <EditorToggle />
            </EditorProvider>
          </SaaSProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
