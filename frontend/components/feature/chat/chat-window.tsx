"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ImagePlus, Send } from "lucide-react";
import { formatTime, todayISO } from "@/lib/utils";
import type { Message } from "@/types";

function Bubble({
  message,
  mine,
}: {
  message: Message;
  mine: boolean;
}) {
  const date = new Date(message.created_at);
  const isToday = date.toISOString().slice(0, 10) === todayISO();
  return (
    <div className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "")}>
      {!mine && <Avatar name={message.sender_id} size="sm" />}
      <div className={cn("max-w-[75%]", mine ? "text-right" : "")}>
        <div
          className={cn(
            "inline-block rounded-md px-3 py-2 text-left text-sm leading-relaxed shadow-sm",
            mine
              ? "rounded-br-sm bg-primary-50 text-neutral-800"
              : "rounded-bl-sm bg-white text-neutral-800 ring-1 ring-neutral-200"
          )}
        >
          {message.content}
        </div>
        <p className="mt-1 px-1 text-[11px] text-neutral-400">
          {isToday ? formatTime(message.created_at) : message.created_at.slice(0, 16).replace("T", " ")}
        </p>
      </div>
    </div>
  );
}

export function ChatWindow({
  peerId,
  peerName,
  messages,
  loading,
  onSend,
  sending,
}: {
  peerId: string | null;
  peerName?: string;
  messages: Message[];
  loading?: boolean;
  onSend: (content: string) => void;
  sending?: boolean;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peerId]);

  if (!peerId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="选择会话开始沟通" description="与绑定康复师 / 患者一对一沟通" />
      </div>
    );
  }

  const submit = () => {
    const content = text.trim();
    if (!content) return;
    onSend(content);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <Avatar name={peerName} size="sm" />
        <p className="text-sm font-medium text-neutral-800">{peerName}</p>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-neutral-50/60 p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-neutral-100" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="还没有消息" description="打个招呼开始沟通吧" />
        ) : (
          messages.map((m) => (
            <Bubble key={m.id} message={m} mine={m.sender_id !== peerId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-neutral-100 bg-white p-3">
        <button
          disabled
          title="图片功能即将上线"
          className="rounded-sm p-2 text-neutral-300"
          aria-label="发送图片（即将上线）"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          }}
          placeholder="输入消息…"
          className="flex-1"
        />
        <Button size="md" onClick={submit} loading={sending} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
          发送
        </Button>
      </div>
    </div>
  );
}
