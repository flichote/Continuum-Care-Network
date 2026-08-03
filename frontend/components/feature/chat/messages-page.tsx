"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { Conversation, Message } from "@/types";

export function MessagesPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await api.get<Conversation[]>("/messages/conversations");
      setConversations(list);
    } catch {
      // ignore
    } finally {
      setConvLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (peerId: string) => {
    setMsgLoading(true);
    try {
      const list = await api.get<Message[]>(`/messages?peer=${peerId}&limit=100`);
      setMessages(list);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "加载消息失败", "error");
    } finally {
      setMsgLoading(false);
    }
  }, [toast]);

  const selectPeer = useCallback(
    (peerId: string) => {
      setActivePeer(peerId);
      setMobileChatOpen(true);
      loadMessages(peerId);
      loadConversations();
    },
    [loadMessages, loadConversations]
  );

  // 初始化：支持 ?peer= 直接打开会话
  useEffect(() => {
    loadConversations();
    const peer = searchParams.get("peer");
    if (peer) {
      setActivePeer(peer);
      setMobileChatOpen(true);
      loadMessages(peer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会话打开时轮询新消息
  useEffect(() => {
    if (!activePeer) return;
    const poll = () => {
      api
        .get<Message[]>(`/messages?peer=${activePeer}&limit=100&mark_read=false`)
        .then((list) => setMessages(list))
        .catch(() => {});
      loadConversations();
    };
    timerRef.current = window.setInterval(poll, 6000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [activePeer, loadConversations]);

  const send = async (content: string) => {
    if (!activePeer) return;
    setSending(true);
    try {
      const msg = await api.post<Message>("/messages", {
        recipient_id: activePeer,
        content,
      });
      setMessages((prev) => [...prev, msg]);
      loadConversations();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "发送失败", "error");
    } finally {
      setSending(false);
    }
  };

  const peerName =
    conversations.find((c) => c.peer_id === activePeer)?.peer_name ?? "会话";

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[480px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm lg:h-[calc(100vh-8rem)]">
      {/* 会话列表（桌面常驻；移动端两屏切换） */}
      <div
        className={`w-full flex-col border-r border-neutral-100 lg:flex lg:w-72 ${
          mobileChatOpen ? "hidden" : "flex"
        }`}
      >
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-base font-semibold text-neutral-800">消息</h2>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activePeerId={activePeer}
            onSelect={selectPeer}
            loading={convLoading}
          />
        </div>
      </div>

      {/* 聊天窗口 */}
      <div className={`min-w-0 flex-1 flex-col ${mobileChatOpen ? "flex" : "hidden lg:flex"}`}>
        {mobileChatOpen && (
          <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileChatOpen(false)}
              aria-label="返回会话列表"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-neutral-800">{peerName}</span>
          </div>
        )}
        <div className="min-h-0 flex-1">
          <ChatWindow
            peerId={activePeer}
            peerName={peerName}
            messages={messages}
            loading={msgLoading}
            onSend={send}
            sending={sending}
          />
        </div>
      </div>
    </div>
  );
}
