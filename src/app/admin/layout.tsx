'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminLayoutClient from "./AdminLayoutClient";
import { ThemeProvider } from "@/providers/ThemeProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const adminRoles = ["admin", "owner", "developer", "manager", "cashier", "warehouse", "employee"];
      if (!profile || !adminRoles.includes(profile.role)) {
        router.replace("/?error=unauthorized");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <ThemeProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </ThemeProvider>
  );
}
