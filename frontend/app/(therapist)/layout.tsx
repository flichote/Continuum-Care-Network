"use client";

import { RequireRole } from "@/components/layout/require-role";
import { AppShell } from "@/components/layout/app-shell";

export default function TherapistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="therapist">
      <AppShell role="therapist">{children}</AppShell>
    </RequireRole>
  );
}
