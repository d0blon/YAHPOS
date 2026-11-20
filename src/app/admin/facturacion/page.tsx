import { Suspense } from "react";
import { DocumentTabs } from "./components/DocumentTabs";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase"; 
import { roleIn, SII_OPERATION_ROLES } from "@/lib/constants/roles";

export const metadata: Metadata = {
  title: "Facturación | YAHPOS!",
  description: "Emisión manual de documentos tributarios electrónicos.",
};

export default async function FacturacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?next=/admin/facturacion");
  }
  
  // Verificar rol en el perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  const allowedRoles = [...SII_OPERATION_ROLES, "superadmin"] as const;
  if (!roleIn(profile?.role, allowedRoles)) {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Administración de Facturación</h1>
        <p className="text-gray-400">
          Gestione la emisión de boletas, facturas, notas de crédito/débito y guías de despacho.
        </p>
      </div>

      <div className="grid gap-6">
        <Suspense fallback={<div className="h-[600px] w-full animate-pulse bg-white/5 rounded-3xl" />}>
          <DocumentTabs />
        </Suspense>
      </div>
    </div>
  );
}
