from contextlib import asynccontextmanager

import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import asyncio
from app.core.config import settings
from app.db.session import engine
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.ai import router as ai_router
from app.api.routes.clauses import router as clauses_router
from app.api.routes.contracts import router as contracts_router
from app.services.notifications import redis_listener
from app.api.routes.notifications import router as notifications_router
from app.api.routes.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # confirm Postgres is reachable on boot
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))

    # start Redis notification listener
    listener_task = asyncio.create_task(redis_listener())

    yield

    # stop listener when app shuts down
    listener_task.cancel()


app = FastAPI(title="ClauseIQ API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(contracts_router)
app.include_router(admin_router)
app.include_router(ai_router)
app.include_router(clauses_router)
app.include_router(notifications_router)
app.include_router(analytics_router)

@app.get("/health")
async def health():
    redis_status = "ok"

    try:
        r = redis.Redis.from_url(settings.redis_url)
        r.ping()
    except Exception as e:
        redis_status = f"error: {e}"

    return {"status": "ok", "redis": redis_status}