"""Klient API CodeTime (tylko odczyt, token w nagłówku Bearer)."""

from __future__ import annotations

from typing import Any

import requests

from .settings import get_settings

BASE_URL = "https://api.codetime.dev/v3/users/self"


class CodeTimeError(RuntimeError):
    """Błąd komunikacji z CodeTime (bez ujawniania treści odpowiedzi)."""


def _get(path: str, params: dict[str, Any]) -> Any:
    token = get_settings().codetime_token
    if not token:
        raise CodeTimeError("Brak CODETIME_TOKEN")
    try:
        response = requests.get(
            BASE_URL + path,
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
    except requests.RequestException as error:
        raise CodeTimeError(f"Błąd sieci: {type(error).__name__}") from error
    if response.status_code != 200:
        raise CodeTimeError(f"CodeTime zwrócił {response.status_code} dla {path}")
    try:
        return response.json()
    except ValueError as error:
        raise CodeTimeError("Odpowiedź nie jest JSON-em") from error


def fetch_language_days(limit: int) -> list[dict[str, Any]]:
    """Dzień x język x minuty (dni bez aktywności API pomija)."""
    payload = _get(
        "/stats",
        {"by": "language", "unit": "days", "tz": get_settings().timezone, "limit": limit},
    )
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, list):
        raise CodeTimeError("Nieoczekiwany format odpowiedzi /stats")
    return data


def fetch_last_event_ms() -> int | None:
    """Czas ostatniego zdarzenia z edytora (ms) albo None, gdy nic się nie dzieje.

    Uwaga: odpowiedź zawiera ścieżki plików i nazwy projektów. Zwracamy z niej
    wyłącznie czas zdarzenia, reszta nigdy nie opuszcza serwera.
    """
    payload = _get("/latest-logs", {"limit": 1})
    if isinstance(payload, list) and payload:
        stamp = payload[0].get("eventTime")
        return int(stamp) if stamp is not None else None
    return None