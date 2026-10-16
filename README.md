# Piotr Zniszczoł: Portfolio

Interaktywne portfolio w React i TypeScript, z animacjami sterowanymi scrollem, trójwymiarowym wirem technologii i backendem, który zbiera statystyki kodowania z CodeTime.

## Co jest w środku

- **Hero i „O mnie"**: tekst odsłaniany słowo po słowie (GSAP SplitText), płynny scroll (Lenis), własny kursor i przełącznik języka PL/EN.
- **Wir technologii (Three.js)**: ikony narzędzi na helisie 3D sterowanej scrollem, z limitem prędkości animacji. Na końcu ikony lecą do docka.
- **Dock w stylu macOS**: ikony powiększają się pod kursorem, a po najechaniu pojawia się podgląd w stylu okna z paska zadań Windows 11 z opisem narzędzia.
- **Aktywność kodowania (w budowie)**: backend FastAPI pobiera dane z CodeTime, zapisuje je w Turso (SQLite), a panel w stylu dashboardu CodeTime powstaje w React.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, GSAP, Lenis, Three.js, i18next
- Backend: Python, FastAPI (Vercel Functions), Turso (hostowany SQLite)
- Hosting: Vercel

## Struktura

```
api/        FastAPI: endpointy CodeTime (status, archiwum, ostatnie dni)
scripts/    import i synchronizacja danych z CodeTime
src/        aplikacja React (sekcje, komponenty, tłumaczenia, ikony)
public/     zasoby statyczne
```

## Uruchomienie lokalnie

Frontend:

```bash
pnpm install
pnpm dev
```

Backend (Windows PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirementsDev.txt
Copy-Item .env.example .env
python scripts/seedCodetime.py
uvicorn api.index:app --reload --port 8000
```

Frontend w trybie developerskim przekierowuje `/api` na `http://localhost:8000`. Bez ustawionych zmiennych Turso backend używa lokalnego pliku SQLite (`local.db`).

## Zmienne środowiskowe

Skopiuj `.env.example` do `.env` (plik jest ignorowany przez Git) i uzupełnij:

| Zmienna | Opis |
|---|---|
| `CODETIME_TOKEN` | token CodeTime (odczyt statystyk) |
| `TURSO_DATABASE_URL` | adres bazy Turso (puste = lokalny `local.db`) |
| `TURSO_AUTH_TOKEN` | token dostępu do bazy Turso |
| `CODETIME_TZ` | strefa czasowa (domyślnie `Europe/Warsaw`) |
| `SYNC_COOLDOWN_S` | minimalny odstęp między synchronizacjami (domyślnie 120) |
| `ACTIVE_WINDOW_S` | jak długo po ostatnim zdarzeniu uznajemy, że koduję (domyślnie 300) |

## Wdrożenie

Projekt jest przygotowany pod Vercel: frontend buduje Vite, a `api/index.py` działa jako funkcja Pythona (reguła w `vercel.json`). Zmienne środowiskowe ustawia się w panelu projektu.
