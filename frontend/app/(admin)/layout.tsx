"use client";

import { RequireRole } from "@/components/layout/require-role";
import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
