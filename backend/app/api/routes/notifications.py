from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.services.notifications import manager

router = APIRouter(tags=["notifications"])


@router.websocket("/ws/notifications/{user_id}")
async def notifications_ws(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep the connection alive; we don't need incoming messages
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


@router.post("/api/notifications")
async def create_notification(
    user_id: str,
    event_type: str,
    message: str,
    db: AsyncSession = Depends(get_db),
):
    notification = Notification(user_id=user_id, event_type=event_type, message=message)
    db.add(notification)
    await db.commit()
    return {"status": "created"}


@router.get("/api/notifications")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    notifications = result.scalars().all()
    return [
        {
            "id": str(n.id),
            "event_type": n.event_type,
            "message": n.message,
            "read": n.read,
            "created_at": n.created_at,
        }
        for n in notifications
    ]