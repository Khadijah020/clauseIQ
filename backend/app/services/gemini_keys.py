import itertools
import threading

from app.core.config import settings


class GeminiKeyPool:
    """Round-robins across multiple API keys, thread/process-safe enough
    for Celery's use case (each worker process gets its own instance)."""

    def __init__(self):
        keys = [k.strip() for k in settings.gemini_api_keys.split(",") if k.strip()]
        if not keys:
            raise ValueError("No Gemini API keys configured in GEMINI_API_KEYS")
        self._keys = keys
        self._cycle = itertools.cycle(keys)
        self._lock = threading.Lock()

    def next_key(self) -> str:
        with self._lock:
            return next(self._cycle)

    def all_keys(self) -> list[str]:
        return list(self._keys)


key_pool = GeminiKeyPool()