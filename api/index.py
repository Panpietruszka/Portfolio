"""Aplikacja FastAPI (Vercel uruchamia ją jako funkcję, lokalnie przez uvicorn)."""
from contextlib import asynccontextmanager
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException, Query, Response  # noqa: E402

from _lib.codetime import CodeTimeError  # noqa: E402
from _lib.reconcile import apply_diff, backup, compare, suspicious  # noqa: E402
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

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Lokalnie (nie na Vercelu) porównuje bazę z CodeTime i naprawia różnice przy starcie.

    Wyłączysz to zmienną RECONCILE_ON_START=0. Błąd nigdy nie blokuje startu API.
    """
    if not PRODUCTION and os.environ.get("RECONCILE_ON_START", "1") != "0":
        try:
            report = compare(14)
            if report.diffs and not suspicious(report):
                path = backup()
                apply_diff(report)
                print(f"Reconcile: naprawiono dni: {len(report.diffs)} (kopia: {path})")
            elif report.diffs:
                print("Reconcile: CodeTime nic nie zwróciło, pomijam naprawę.")
            else:
                print("Reconcile: baza zgadza się z CodeTime.")
        except Exception:
            logger.exception("Reconcile przy starcie nie powiódł się")
    yield


app = FastAPI(
    title="Portfolio API",
    lifespan=lifespan,
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
    cache(response, 5, 10)
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
    failed = False
    try:
        synced = sync_recent(days)["synced"]
    except CodeTimeError:
        logger.exception("CodeTime sync")  # zwracamy to, co już mamy w bazie
        failed = True
    cache(response, 5 if failed else 20)
    return {
        "synced": synced,
        "failed": failed,
        "updatedAt": last_sync_ms(),
        "days": read_days(days_back(days)),
    }