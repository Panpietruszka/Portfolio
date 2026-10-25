"""Porównuje bazę z CodeTime i naprawia rozbieżności (uruchamiane z terminala).

Przykłady:
  python scripts/reconcileCodetime.py --dry-run     # tylko pokaż różnice (30 dni)
  python scripts/reconcileCodetime.py               # pokaż różnice i zapytaj o naprawę
  python scripts/reconcileCodetime.py --days 90     # szerszy zakres
  python scripts/reconcileCodetime.py --full        # od pierwszego dnia w bazie
  python scripts/reconcileCodetime.py --yes         # naprawa bez pytania
"""

import argparse
import sys
from datetime import date
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from _lib.codetime import CodeTimeError  # noqa: E402
from _lib.db import backend_name, get_db  # noqa: E402
from _lib.reconcile import Report, apply_diff, backup, compare, suspicious  # noqa: E402
from _lib.settings import get_settings  # noqa: E402

LABELS = {"missing": "brak w bazie", "extra": "nadmiar w bazie", "changed": "różni się"}


def print_report(report: Report) -> None:
    print(f"\n{'DATA':<12}{'STAN':<17}{'BAZA':>9}{'CODETIME':>11}{'RÓŻNICA':>10}")
    for diff in report.diffs:
        delta = diff.remote_total - diff.local_total
        print(
            f"{diff.date:<12}{LABELS[diff.kind]:<17}"
            f"{diff.local_total:>6} min{diff.remote_total:>8} min{delta:>+9}"
        )
        for language in sorted(set(diff.local) | set(diff.remote)):
            before, after = diff.local.get(language, 0), diff.remote.get(language, 0)
            if before != after:
                print(f"    {language}: {before} -> {after}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--days", type=int, default=30, help="ile ostatnich dni porównać")
    parser.add_argument("--full", action="store_true", help="od pierwszego dnia w bazie")
    parser.add_argument("--dry-run", action="store_true", help="tylko pokaż różnice")
    parser.add_argument("--yes", action="store_true", help="nie pytaj o potwierdzenie")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="pozwól na naprawę, gdy CodeTime zwraca zero dni (domyślnie to blokada)",
    )
    args = parser.parse_args()

    settings = get_settings()
    today = datetime.now(ZoneInfo(settings.timezone)).date()
    print(f"Baza: {backend_name()}, strefa: {settings.timezone}, dziś: {today}")
    if not settings.turso_url:
        print("UWAGA: pracuję na lokalnym pliku, to NIE jest baza produkcyjna (brak TURSO_*).")

    try:
        db = get_db()
        days = args.days
        if args.full:
            first = db.query("SELECT MIN(date) FROM daily_language")[0][0]
            if first:
                days = (today - date.fromisoformat(first)).days + 1
        report = compare(days, db)
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

    print(f"Zakres: od {report.start}, wierszy w bazie: {report.local_rows}, "
          f"w CodeTime: {report.remote_rows}")

    if not report.diffs:
        print("Baza zgadza się z CodeTime.")
        return 0

    print_report(report)

    if suspicious(report) and not args.allow_empty:
        print("\nCodeTime nie zwróciło żadnych dni, a baza ma dane. To wygląda na awarię API, "
              "więc niczego nie zmieniam (wymuś flagą --allow-empty).")
        return 2
    if args.dry_run:
        print("\nTryb --dry-run: nic nie zapisano.")
        return 0
    if not args.yes and input("\nZapisać zmiany w bazie? [t/N]: ").strip().lower() not in ("t", "y"):
        print("Anulowano.")
        return 0

    try:
        print(f"Kopia zapasowa: {backup(db)}")
        apply_diff(report, db)
        left = [d for d in compare(days, db).diffs if d.date != today.isoformat()]
    except (CodeTimeError, requests.HTTPError, RuntimeError) as error:
        print(f"BŁĄD podczas naprawy: {error}")
        return 1

    if left:
        print(f"Po naprawie nadal różnią się dni: {', '.join(d.date for d in left)}")
        return 1
    print(f"Naprawiono dni: {len(report.diffs)}. Baza zgadza się z CodeTime "
          "(dzisiejszy dzień może jeszcze rosnąć).")
    return 0


if __name__ == "__main__":
    sys.exit(main())