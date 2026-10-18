"""Import i synchronizacja danych CodeTime do bazy.

Przykłady:
  python scripts/seedCodetime.py                          # pierwszy import: 90 dni
  python scripts/seedCodetime.py --days 7                 # dosynchronizowanie ostatnich dni
  python scripts/seedCodetime.py --days 7 --require-remote  # w CI: wymaga Turso
"""

import argparse
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from _lib.codetime import CodeTimeError  # noqa: E402
from _lib.db import backend_name  # noqa: E402
from _lib.sync import read_days, sync_recent  # noqa: E402

REQUIRED = ("CODETIME_TOKEN", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN")


def describe_env() -> None:
    """Pokazuje, które zmienne są ustawione (bez wypisywania wartości)."""
    for name in REQUIRED:
        state = "ustawiona" if os.environ.get(name, "").strip() else "BRAK"
        print(f"{name}: {state}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--days", type=int, default=90, help="ile ostatnich dni pobrać (1-90)")
    parser.add_argument(
        "--require-remote",
        action="store_true",
        help="przerwij, jeśli nie ustawiono Turso (dla CI)",
    )
    args = parser.parse_args()

    describe_env()
    remote = all(os.environ.get(name, "").strip() for name in REQUIRED[1:])
    if args.require_remote and not remote:
        print("BŁĄD: brak TURSO_DATABASE_URL lub TURSO_AUTH_TOKEN, przerywam.")
        return 1

    try:
        print(f"Baza: {backend_name()}")
        result = sync_recent(args.days, force=True)
        print(f"Synchronizacja: {result}")
        days = read_days()
    except CodeTimeError as error:
        print(f"BŁĄD CodeTime: {error}")
        return 1
    except requests.HTTPError as error:
        status = error.response.status_code if error.response is not None else "?"
        print(f"BŁĄD bazy Turso: HTTP {status} (sprawdź adres i token bazy)")
        return 1
    except RuntimeError as error:
        print(f"BŁĄD: {error}")
        return 1

    if not days:
        print("Baza jest pusta.")
        return 0
    total = sum(day["total"] for day in days)
    print(
        f"W bazie: {len(days)} dni z aktywnością, od {days[0]['date']} do {days[-1]['date']}, "
        f"razem {total // 60} h {total % 60} min"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())