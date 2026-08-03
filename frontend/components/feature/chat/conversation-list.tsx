"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";
import type { Conversation } from "@/types";

export function ConversationList({
  conversations,
  activePeerId,
  onSelect,
  loading,
}: {
  conversations: Conversation[];
  activePeerId?: string | null;
  onSelect: (peerId: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-sm bg-neutral-100" />
        ))}
      </div>
    );
  }
  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-neutral-400">
        暂无会话
        <p className="mt-1 text-xs">建立绑定关系后即可与对方沟通</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {conversations.map((c) => {
        const active = c.peer_id === activePeerId;
        return (
          <li key={c.peer_id}>
            <button
              onClick={() => onSelect(c.peer_id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                active ? "bg-primary-50" : "hover:bg-neutral-50"
              )}
            >
              <Avatar name={c.peer_name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {c.peer_name}
                  </p>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {timeAgo(c.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-neutral-500">
                    {c.last_message || "暂无消息"}
                  </p>
                  {c.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-medium text-white">
                      {c.unread_count > 99 ? "99+" : c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
