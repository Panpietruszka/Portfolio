"""Warstwa bazy danych: Turso przez HTTP (produkcja) albo plik SQLite (lokalnie)."""

from __future__ import annotations

import base64
import sqlite3
from typing import Any, Sequence

import requests

from .settings import get_settings

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS daily_language (
        date TEXT NOT NULL,
        language TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        PRIMARY KEY (date, language)
    )""",
    """CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )""",
]

Statement = tuple[str, Sequence[Any]]


class LocalDatabase:
    """Zwykły plik SQLite (development)."""

    def __init__(self, path: str) -> None:
        self.path = path

    def query(self, sql: str, params: Sequence[Any] = ()) -> list[tuple]:
        conn = sqlite3.connect(self.path)
        try:
            return conn.execute(sql, tuple(params)).fetchall()
        finally:
            conn.close()

    def run(self, statements: Sequence[Statement]) -> None:
        """Wykonuje wszystkie polecenia w jednej transakcji (commit albo rollback)."""
        conn = sqlite3.connect(self.path)
        try:
            with conn:
                for sql, params in statements:
                    conn.execute(sql, tuple(params))
        finally:
            conn.close()


class TursoDatabase:
    """Turso (hostowany SQLite) przez HTTP: POST /v2/pipeline z tokenem Bearer."""

    def __init__(self, url: str, token: str) -> None:
        self.endpoint = f"{url}/v2/pipeline"
        self.session = requests.Session()
        self.session.headers.update(
            {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        )

    @staticmethod
    def _arg(value: Any) -> dict[str, Any]:
        if value is None:
            return {"type": "null"}
        if isinstance(value, bool):
            return {"type": "integer", "value": str(int(value))}
        if isinstance(value, int):
            return {"type": "integer", "value": str(value)}
        if isinstance(value, float):
            return {"type": "float", "value": value}
        return {"type": "text", "value": str(value)}

    @staticmethod
    def _cell(cell: Any) -> Any:
        if not isinstance(cell, dict):
            return cell
        kind = cell.get("type")
        if kind == "null":
            return None
        if kind == "integer":
            return int(cell["value"])
        if kind == "float":
            return float(cell["value"])
        if kind == "blob":
            return base64.b64decode(cell.get("base64", ""))
        return cell.get("value")

    @classmethod
    def _stmt(cls, sql: str, params: Sequence[Any]) -> dict[str, Any]:
        stmt: dict[str, Any] = {"sql": sql}
        if params:  # args trzeba pominąć, gdy puste (null jest niepoprawne)
            stmt["args"] = [cls._arg(p) for p in params]
        return {"type": "execute", "stmt": stmt}

    def _pipeline(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        response = self.session.post(
            self.endpoint,
            json={"requests": batch + [{"type": "close"}]},
            timeout=15,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        for item in results:
            if item.get("type") == "error":
                message = item.get("error", {}).get("message", "nieznany błąd")
                raise RuntimeError(f"Turso: {message}")
        return results

    def query(self, sql: str, params: Sequence[Any] = ()) -> list[tuple]:
        results = self._pipeline([self._stmt(sql, params)])
        rows = results[0]["response"]["result"]["rows"]
        return [tuple(self._cell(c) for c in row) for row in rows]

    def run(self, statements: Sequence[Statement]) -> None:
        """Jedna transakcja w jednym żądaniu (błąd w środku = brak commitu)."""
        batch = [{"type": "execute", "stmt": {"sql": "BEGIN"}}]
        batch += [self._stmt(sql, params) for sql, params in statements]
        batch.append({"type": "execute", "stmt": {"sql": "COMMIT"}})
        self._pipeline(batch)


Database = LocalDatabase | TursoDatabase

_db: Database | None = None
_schema_ready = False


def backend_name() -> str:
    settings = get_settings()
    if settings.turso_url:
        return "Turso"
    return f"lokalny SQLite ({settings.local_db_path})"


def get_db() -> Database:
    global _db, _schema_ready
    if _db is None:
        settings = get_settings()
        if settings.turso_url:
            if not settings.turso_token:
                raise RuntimeError("Brak TURSO_AUTH_TOKEN")
            _db = TursoDatabase(settings.turso_url, settings.turso_token)
        else:
            _db = LocalDatabase(settings.local_db_path)
    if not _schema_ready:
        _db.run([(sql, ()) for sql in SCHEMA])
        _schema_ready = True
    return _db


def get_meta(db: Database, key: str) -> str | None:
    rows = db.query("SELECT value FROM meta WHERE key = ?", (key,))
    return rows[0][0] if rows else None


def set_meta(key: str, value: str) -> Statement:
    return (
        "INSERT INTO meta(key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )