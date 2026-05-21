'use client'

import { SaaSProvider } from "@/providers/SaaSProvider";
import { EditorProvider } from "@/providers/EditorProvider";
import { EditorToggle } from "@/components/editor/EditorToggle";
import { BrandThemeSetter } from "@/providers/BrandThemeSetter";
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
    <SaaSProvider initialStoreId={initialStoreId} initialConfig={initialConfig}>
      <BrandThemeSetter />
      <EditorProvider>
        {children}
        <EditorToggle />
      </EditorProvider>
    </SaaSProvider>
  );
}
