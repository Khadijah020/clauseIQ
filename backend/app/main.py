from contextlib import asynccontextmanager

import redis
from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.api.routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # confirm Postgres is reachable on boot
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    yield


app = FastAPI(title="ClauseIQ API", lifespan=lifespan)

app.include_router(auth_router)


@app.get("/health")
async def health():
    redis_status = "ok"

    try:
        r = redis.Redis.from_url(settings.redis_url)
        r.ping()
    except Exception as e:
        redis_status = f"error: {e}"

    return {"status": "ok", "redis": redis_status}