'use client'

import { SaaSProvider } from "@/providers/SaaSProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { EditorProvider } from "@/providers/EditorProvider";
import { EditorToggle } from "@/components/editor/EditorToggle";
import type { ReactNode } from "react";

export default function AppProviders({ 
  children,
  initialStoreId,
  initialConfig
}: { 
  children: ReactNode,
  initialStoreId?: string | null,
  initialConfig?: any | null
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SaaSProvider initialStoreId={initialStoreId} initialConfig={initialConfig}>
        <EditorProvider>
          {children}
          <EditorToggle />
        </EditorProvider>
      </SaaSProvider>
    </ThemeProvider>
  );
}
