import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirigir si no hay sesión activa (Doble verificación post-middleware)
  if (!user) {
    redirect("/login?next=/admin");
  }

  // Verificar si el usuario tiene un perfil y un rol administrativo básico
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const adminRoles = ["admin", "owner", "developer", "manager", "cashier", "warehouse", "employee"];
  if (!profile || !adminRoles.includes(profile.role)) {
    redirect("/?error=unauthorized");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
