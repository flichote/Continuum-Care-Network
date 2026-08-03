"""Private messaging endpoints (PRD F7)."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    ensure_binding_between,
    get_current_user,
    require_roles,
)
from app.core.enums import Role
from app.db import get_db
from app.models import Message, User
from app.schemas.api import (
    ConversationOut,
    MessageIn,
    MessageOut,
    UnreadCountOut,
)

router = APIRouter(prefix="/messages", tags=["messages"])


async def _peer_name(db: AsyncSession, peer_id: UUID) -> str:
    peer = await db.get(User, peer_id)
    return peer.full_name if peer else "已注销用户"


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationOut]:
    """会话列表：每个对端最近一条消息 + 未读数（F7.3）。"""
    result = await db.execute(
        select(Message)
        .where(
            or_(
                Message.sender_id == current_user.id,
                Message.recipient_id == current_user.id,
            )
        )
        .order_by(Message.created_at.desc())
    )
    messages = result.scalars().all()

    # group by peer, keep latest message + unread count
    from collections import defaultdict

    peers: dict[UUID, dict] = defaultdict(
        lambda: {"last": None, "unread": 0}
    )
    for m in messages:
        peer_id = m.recipient_id if m.sender_id == current_user.id else m.sender_id
        info = peers[peer_id]
        if info["last"] is None:
            info["last"] = m
        if m.recipient_id == current_user.id and not m.is_read:
            info["unread"] += 1

    conversations: list[ConversationOut] = []
    for peer_id, info in peers.items():
        last = info["last"]
        conversations.append(
            ConversationOut(
                peer_id=peer_id,
                peer_name=await _peer_name(db, peer_id),
                last_message=last.content if last else None,
                last_message_at=last.created_at if last else None,
                unread_count=info["unread"],
            )
        )
    conversations.sort(key=lambda c: c.last_message_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return conversations


@router.get("", response_model=list[MessageOut])
async def list_messages(
    peer: UUID = Query(..., description="对端用户 ID"),
    limit: int = Query(50, ge=1, le=200),
    before: Optional[datetime] = Query(None),
    mark_read: bool = Query(True, description="读取后自动标记对方消息为已读"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Message]:
    """与对端的消息记录（仅绑定关系双方，F7.4）。"""
    await ensure_binding_between(db, current_user.id, peer)

    filters = [
        or_(
            (Message.sender_id == current_user.id) & (Message.recipient_id == peer),
            (Message.sender_id == peer) & (Message.recipient_id == current_user.id),
        )
    ]
    if before:
        filters.append(Message.created_at < before)
    stmt = (
        select(Message)
        .where(*filters)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = (await db.execute(stmt)).scalars().all()
    messages.reverse()

    if mark_read:
        incoming = [m for m in messages if m.recipient_id == current_user.id and not m.is_read]
        now = datetime.now(timezone.utc)
        for m in incoming:
            m.is_read = True
            m.read_at = now
        await db.flush()
    return messages


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UnreadCountOut:
    count = (
        await db.execute(
            select(func.count()).select_from(Message).where(
                Message.recipient_id == current_user.id,
                Message.is_read.is_(False),
            )
        )
    ).scalar_one()
    return UnreadCountOut(unread_count=count)


@router.post("", response_model=MessageOut, status_code=201)
async def send_message(
    payload: MessageIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Message:
    """发送站内消息：仅绑定关系双方可互发（F7.4）；管理员不参与对话。"""
    if current_user.role == Role.ADMIN.value:
        raise HTTPException(status_code=403, detail="管理员不参与站内对话")
    recipient = await db.get(User, payload.recipient_id)
    if recipient is None or recipient.role == Role.ADMIN.value:
        raise HTTPException(status_code=404, detail="接收方不存在")
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能给自己发消息")
    await ensure_binding_between(db, current_user.id, recipient.id)

    message = Message(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        content=payload.content,
    )
    db.add(message)
    await db.flush()
    return message


@router.put("/{message_id}/read", response_model=MessageOut)
async def mark_read(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Message:
    """标记单条消息已读。"""
    message = await db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="消息不存在")
    if message.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能标记发给自己的消息")
    if not message.is_read:
        message.is_read = True
        message.read_at = datetime.now(timezone.utc)
        await db.flush()
    return message
