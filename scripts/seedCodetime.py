"""Import i synchronizacja danych CodeTime do bazy.

Przykłady:
  python scripts/seedCodetime.py            # pierwszy import: 90 dni
  python scripts/seedCodetime.py --days 7   # dosynchronizowanie ostatnich dni
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from _lib.db import backend_name  # noqa: E402
from _lib.sync import read_days, sync_recent  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--days", type=int, default=90, help="ile ostatnich dni pobrać (1-90)")
    args = parser.parse_args()

    print(f"Baza: {backend_name()}")
    result = sync_recent(args.days, force=True)
    print(f"Synchronizacja: {result}")

    days = read_days()
    if not days:
        print("Baza jest pusta.")
        return
    total = sum(day["total"] for day in days)
    print(
        f"W bazie: {len(days)} dni z aktywnością, od {days[0]['date']} do {days[-1]['date']}, "
        f"razem {total // 60} h {total % 60} min"
    )


if __name__ == "__main__":
    main()