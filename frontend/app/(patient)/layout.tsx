"use client";

import { RequireRole } from "@/components/layout/require-role";
import { AppShell } from "@/components/layout/app-shell";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="patient">
      <AppShell role="patient">{children}</AppShell>
    </RequireRole>
  );
}
