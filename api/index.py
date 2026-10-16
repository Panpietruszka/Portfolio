"""Aplikacja FastAPI (Vercel uruchamia ją jako funkcję, lokalnie przez uvicorn)."""

import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException, Query, Response  # noqa: E402

from _lib.codetime import CodeTimeError  # noqa: E402
from _lib.settings import get_settings  # noqa: E402
from _lib.sync import (  # noqa: E402
    days_back,
    get_status,
    last_sync_ms,
    read_days,
    sync_recent,
)

logger = logging.getLogger("portfolio-api")
PRODUCTION = bool(os.environ.get("VERCEL"))

app = FastAPI(
    title="Portfolio API",
    docs_url=None if PRODUCTION else "/api/docs",
    redoc_url=None,
    openapi_url=None if PRODUCTION else "/api/openapi.json",
)


def cache(response: Response, s_maxage: int, stale: int = 0) -> None:
    """Pozwala CDN-owi Vercela współdzielić odpowiedź między odwiedzającymi."""
    response.headers["Cache-Control"] = (
        f"public, s-maxage={s_maxage}, stale-while-revalidate={stale}"
    )


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/codetime/status")
def codetime_status(response: Response) -> dict:
    """Tylko {active, lastEventAt}: ścieżki plików i projekty nie opuszczają serwera."""
    try:
        status = get_status()
    except CodeTimeError:
        logger.exception("CodeTime status")
        raise HTTPException(status_code=502, detail="CodeTime niedostępny")
    cache(response, 30, 60)
    return status


@app.get("/api/codetime/archive")
def codetime_archive(response: Response) -> dict:
    """Całe archiwum raz; zakresy z listy liczy przeglądarka."""
    days = read_days()
    cache(response, 60, 300)
    return {
        "timezone": get_settings().timezone,
        "since": days[0]["date"] if days else None,
        "updatedAt": last_sync_ms(),
        "days": days,
    }


@app.get("/api/codetime/recent")
def codetime_recent(response: Response, days: int = Query(3, ge=1, le=14)) -> dict:
    """Dosynchronizowuje ostatnie dni (z cooldownem) i zwraca je."""
    synced = False
    try:
        synced = sync_recent(days)["synced"]
    except CodeTimeError:
        logger.exception("CodeTime sync")  # zwracamy to, co już mamy w bazie
    cache(response, 20)
    return {
        "synced": synced,
        "updatedAt": last_sync_ms(),
        "days": read_days(days_back(days)),
    }