"""Ustawienia ze zmiennych środowiskowych (lokalnie opcjonalnie z pliku .env)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

try:  # lokalny development: wczytaj .env, jeśli python-dotenv jest zainstalowany
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:
    pass


def _http_url(url: str) -> str:
    """libsql://nazwa.turso.io -> https://nazwa.turso.io"""
    url = url.strip().rstrip("/")
    if url.startswith("libsql://"):
        return "https://" + url[len("libsql://"):]
    return url


@dataclass(frozen=True)
class Settings:
    codetime_token: str
    turso_url: str
    turso_token: str
    local_db_path: str
    timezone: str
    sync_cooldown_s: int
    active_window_s: int


def get_settings() -> Settings:
    return Settings(
        codetime_token=os.environ.get("CODETIME_TOKEN", "").strip(),
        turso_url=_http_url(os.environ.get("TURSO_DATABASE_URL", "")),
        turso_token=os.environ.get("TURSO_AUTH_TOKEN", "").strip(),
        local_db_path=os.environ.get("LOCAL_DB_PATH", str(ROOT / "local.db")),
        timezone=os.environ.get("CODETIME_TZ", "Europe/Warsaw"),
        sync_cooldown_s=int(os.environ.get("SYNC_COOLDOWN_S", "120")),
        active_window_s=int(os.environ.get("ACTIVE_WINDOW_S", "300")),
    )