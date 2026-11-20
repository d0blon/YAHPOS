'use client'

import { SaaSProvider } from "@/providers/SaaSProvider";
import { EditorProvider } from "@/providers/EditorProvider";
import { EditorToggle } from "@/components/editor/EditorToggle";
import { BrandThemeSetter } from "@/providers/BrandThemeSetter";
import type { ReactNode } from "react";

interface InitialStoreConfig {
  id?: string
  tier?: 'austral' | 'archipielago' | 'patagonia'
  store_name?: string
  store_logo?: string | null
  tax_id?: string | null
  white_label_enabled?: boolean
  accent_color?: string
  appearance_primary_color?: string
  surface_color?: string | null
}

export default function AppProviders({ 
  children,
  initialStoreId,
  initialConfig
}: { 
  children: ReactNode,
  initialStoreId?: string | null,
  initialConfig?: InitialStoreConfig | null
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
