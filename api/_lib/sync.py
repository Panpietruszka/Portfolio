"""Synchronizacja CodeTime -> baza, odczyt archiwum i status aktywności."""

from __future__ import annotations

import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .codetime import fetch_language_days, fetch_last_event_ms
from .db import get_db, get_meta, set_meta
from .languages import normalize_language
from .settings import get_settings

_status_cache: tuple[float, dict] | None = None

# CodeTime przyjmuje limit do 90 dni, a my pobieramy o jeden więcej (odrzucamy niepełny najstarszy dzień)
MAX_DAYS = 89


def _today() -> datetime:
    return datetime.now(ZoneInfo(get_settings().timezone))


def last_sync_ms() -> int | None:
    value = get_meta(get_db(), "last_sync_at")
    return int(float(value) * 1000) if value is not None else None


def aggregate(raw: list[dict]) -> dict[tuple[str, str], int]:
    """Surowe wiersze CodeTime -> {(data, język): minuty}.

    Kilka surowych nazw może dać ten sam język (np. json + jsonc), więc sumujemy.
    """
    totals: dict[tuple[str, str], int] = {}
    for item in raw:
        key = (str(item["time"]), normalize_language(str(item["by"])))
        totals[key] = totals.get(key, 0) + int(item["duration"])
    return totals

def fetch_window(days: int) -> dict[tuple[str, str], int]:
    """Ostatnie `days` PEŁNYCH dni (dziś włącznie), jako {(data, język): minuty}.

    CodeTime liczy okno kroczące od chwili zapytania, więc najstarszy zwrócony dzień
    jest niepełny. Pobieramy o dzień więcej i go odrzucamy.
    """
    start = days_back(days - 1)
    totals = aggregate(fetch_language_days(days + 1))
    return {key: minutes for key, minutes in totals.items() if key[0] >= start}


def sync_recent(days: int, *, force: bool = False) -> dict:
    """Pobiera ostatnie dni z CodeTime i zastępuje nimi odpowiednie dni w bazie.

    Bez force działa najwyżej raz na sync_cooldown_s (czas zapisany w bazie,
    więc ograniczenie obowiązuje wszystkie instancje funkcji naraz).
    """
    settings = get_settings()
    db = get_db()
    now = time.time()

    last = get_meta(db, "last_sync_at")
    if not force and last is not None and now - float(last) < settings.sync_cooldown_s:
        return {"synced": False, "updatedAt": int(float(last) * 1000)}
    days = max(1, min(days, MAX_DAYS))
    totals = fetch_window(days)

    statements = []
    if totals:
        # okno obejmuje też dni z zakresu, dla których CodeTime nie zwróciło już nic,
        # więc nieaktualne wpisy znikają z bazy (lustro tego, co widać w CodeTime)
        first = days_back(days - 1)
        last_day = max(max(date for date, _ in totals), _today().date().isoformat())
        # okno od najstarszego zwróconego dnia do dziś jest zastępowane w całości,
        # dzięki czemu poprawki po stronie CodeTime trafiają też do nas
        statements.append(
            ("DELETE FROM daily_language WHERE date >= ? AND date <= ?", (first, last_day))
        )
        statements += [
            (
                "INSERT INTO daily_language(date, language, minutes) VALUES (?, ?, ?)",
                (date, language, minutes),
            )
            for (date, language), minutes in sorted(totals.items())
        ]
    statements.append(set_meta("last_sync_at", str(now)))
    db.run(statements)

    return {
        "synced": True,
        "updatedAt": int(now * 1000),
        "days": len({date for date, _ in totals}),
        "rows": len(totals),
    }


def read_days(since: str | None = None) -> list[dict]:
    """Dni w postaci {date, total, languages: {język: minuty}}, od najstarszego."""
    db = get_db()
    if since:
        rows = db.query(
            "SELECT date, language, minutes FROM daily_language WHERE date >= ? ORDER BY date",
            (since,),
        )
    else:
        rows = db.query("SELECT date, language, minutes FROM daily_language ORDER BY date")

    days: dict[str, dict] = {}
    for date, language, minutes in rows:
        entry = days.setdefault(date, {"date": date, "total": 0, "languages": {}})
        entry["languages"][language] = minutes
        entry["total"] += minutes
    return list(days.values())


def days_back(count: int) -> str:
    return (_today() - timedelta(days=count)).date().isoformat()


def get_status() -> dict:
    """Czy teraz kodujesz?

    latest-logs zwraca zdarzenie tylko przez kilkanaście sekund po jego wysłaniu,
    więc ostatni zauważony czas zdarzenia zapamiętujemy w bazie (wspólnej dla
    wszystkich instancji) i uznajemy, że kodujesz, jeszcze przez active_hold_s sekund.
    """
    global _status_cache
    settings = get_settings()
    now = time.time()
    if _status_cache and now - _status_cache[0] < 8:
        return _status_cache[1]

    db = get_db()
    stored = get_meta(db, "last_event_ms")
    last_ms = int(stored) if stored else None

    event_ms = fetch_last_event_ms()
    if event_ms is not None and event_ms != last_ms:
        db.run([set_meta("last_event_ms", str(event_ms))])
        last_ms = event_ms

    now_ms = int(now * 1000)
    active = last_ms is not None and (now_ms - last_ms) <= settings.active_hold_s * 1000
    status = {"active": active, "lastEventAt": last_ms, "serverTime": now_ms}
    _status_cache = (now, status)
    return status