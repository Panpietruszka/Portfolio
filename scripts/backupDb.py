"""Kopia zapasowa bazy do pliku JSON (uruchamiana przez GitHub Actions)."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from _lib.db import backend_name, get_db  # noqa: E402


def main() -> None:
    if os.environ.get("GITHUB_ACTIONS") and not os.environ.get("TURSO_DATABASE_URL", "").strip():
        sys.exit("BŁĄD: w CI brakuje TURSO_DATABASE_URL, backup byłby pusty.")
    db = get_db()
    rows = db.query(
        "SELECT date, language, minutes FROM daily_language ORDER BY date, language"
    )
    meta = db.query("SELECT key, value FROM meta ORDER BY key")

    now = datetime.now(timezone.utc)
    target = Path("backups") / f"codetime-{now:%Y-%m-%d}.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(
        json.dumps(
            {
                "exportedAt": now.isoformat(),
                "daily_language": [
                    {"date": d, "language": lang, "minutes": m} for d, lang, m in rows
                ],
                "meta": {key: value for key, value in meta},
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Baza: {backend_name()}")
    print(f"Zapisano {len(rows)} wierszy do {target}")


if __name__ == "__main__":
    main()