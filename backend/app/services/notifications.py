import asyncio
import json

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.core.config import settings


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active:
            self.active[user_id].remove(websocket)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        print("Active connections:", self.active)
        
        for ws in self.active.get(user_id, []):
            print("Sending WebSocket notification")
            await ws.send_json(message)


manager = ConnectionManager()


async def redis_listener():
    redis_client = aioredis.from_url(settings.redis_url)
    pubsub = redis_client.pubsub()

    await pubsub.subscribe("notifications")
    print("Redis notification listener started")

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue

        print("Redis notification received:", message["data"])

        data = json.loads(message["data"])

        print("Sending notification to:", data["user_id"])

        await manager.send_to_user(data["user_id"], data)

def publish_notification_sync(user_id: str, event_type: str, message: str):
    """Called from Celery tasks (sync context) — publishes to Redis, which
    the async listener above picks up and forwards to the live WebSocket."""
    import redis as sync_redis
    r = sync_redis.Redis.from_url(settings.redis_url)
    r.publish("notifications", json.dumps({
        "user_id": user_id,
        "event_type": event_type,
        "message": message,
    }))