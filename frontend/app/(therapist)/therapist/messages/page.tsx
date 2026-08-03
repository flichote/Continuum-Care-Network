"use client";

import { Suspense } from "react";
import { MessagesPage } from "@/components/feature/chat/messages-page";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function TherapistMessagesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MessagesPage />
    </Suspense>
  );
}
