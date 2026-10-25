"""Porównanie bazy z CodeTime i naprawa rozbieżności (wspólna logika dla CLI i startu API)."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .db import Database, get_db, set_meta
from .settings import ROOT
from .sync import MAX_DAYS, days_back, fetch_window


@dataclass
class DayDiff:
    date: str
    kind: str  # "missing" (brak w bazie) | "extra" (nadmiarowy w bazie) | "changed"
    local: dict[str, int]
    remote: dict[str, int]

    @property
    def local_total(self) -> int:
        return sum(self.local.values())

    @property
    def remote_total(self) -> int:
        return sum(self.remote.values())


@dataclass
class Report:
    start: str
    diffs: list[DayDiff]
    remote_rows: int
    local_rows: int


def _by_day(totals: dict[tuple[str, str], int]) -> dict[str, dict[str, int]]:
    days: dict[str, dict[str, int]] = {}
    for (date, language), minutes in totals.items():
        days.setdefault(date, {})[language] = minutes
    return days


def compare(days: int, db: Database | None = None) -> Report:
    """Porównuje ostatnie `days` dni z bazy z tym, co zwraca CodeTime."""
    db = db or get_db()
    days = max(1, min(days, MAX_DAYS))
    remote = fetch_window(days)
    start = days_back(days - 1)

    rows = db.query(
        "SELECT date, language, minutes FROM daily_language WHERE date >= ?", (start,)
    )
    local = {(date, language): int(minutes) for date, language, minutes in rows}

    local_days, remote_days = _by_day(local), _by_day(remote)
    diffs: list[DayDiff] = []
    for date in sorted(set(local_days) | set(remote_days)):
        left, right = local_days.get(date, {}), remote_days.get(date, {})
        if left == right:
            continue
        kind = "missing" if not left else "extra" if not right else "changed"
        diffs.append(DayDiff(date, kind, left, right))
    return Report(start, diffs, len(remote), len(local))


def suspicious(report: Report) -> bool:
    """CodeTime nic nie zwróciło, a baza ma dane z tego okna: wygląda na awarię API."""
    return report.remote_rows == 0 and report.local_rows > 0


def backup(db: Database | None = None) -> Path:
    """Zapisuje całą tabelę do backups/preReconcile-<czas>.json przed naprawą."""
    db = db or get_db()
    rows = db.query(
        "SELECT date, language, minutes FROM daily_language ORDER BY date, language"
    )
    now = datetime.now(timezone.utc)
    target = ROOT / "backups" / f"preReconcile-{now:%Y%m%d-%H%M%S}.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(
        json.dumps(
            {
                "exportedAt": now.isoformat(),
                "daily_language": [
                    {"date": d, "language": lang, "minutes": m} for d, lang, m in rows
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return target


def apply_diff(report: Report, db: Database | None = None) -> None:
    """Zastępuje różniące się dni wersją z CodeTime (jedna transakcja)."""
    if not report.diffs:
        return
    db = db or get_db()
    statements = []
    for diff in report.diffs:
        statements.append(("DELETE FROM daily_language WHERE date = ?", (diff.date,)))
        statements += [
            (
                "INSERT INTO daily_language(date, language, minutes) VALUES (?, ?, ?)",
                (diff.date, language, minutes),
            )
            for language, minutes in sorted(diff.remote.items())
        ]
    statements.append(set_meta("last_sync_at", str(time.time())))
    db.run(statements)