# Piotr Zniszczoł | Portfolio

Interaktywne portfolio łączące animacje sterowane przewijaniem,
wizualizację technologii w 3D i własny backend do statystyk kodowania.

**React · TypeScript · Three.js · GSAP · Python · FastAPI**

[Zobacz portfolio](https://portfolio-vscode-magic.vercel.app/)

---

## O projekcie

Moja osobista strona i przestrzeń do rozwijania interaktywnych
interfejsów. Projekt łączy prezentację informacji o mnie z animacjami,
elementami 3D i integracją danych z CodeTime.

Frontend powstał w React i TypeScript. Za pobieranie i przechowywanie
statystyk kodowania odpowiada backend w Pythonie, oparty na FastAPI.

## Najważniejsze elementy

### Animacje i nawigacja

Sekcje Hero i „O mnie” wykorzystują odsłanianie tekstu słowo po słowie
przez GSAP SplitText. Lenis odpowiada za płynne przewijanie.

Interfejs obejmuje również własny kursor i przełącznik języka PL/EN.

### Helisa technologii 3D

Wizualizacja Three.js przedstawia narzędzia rozmieszczone na helisie,
której ruch jest sterowany przewijaniem i ma ograniczoną prędkość.

Na końcu sekwencji ikony przemieszczają się do docka.

### Interaktywny dock

Dock inspirowany macOS powiększa ikony pod kursorem. Po najechaniu
wyświetla podgląd z opisem narzędzia, inspirowany podglądami okien
z paska zadań Windows 11.

### Statystyki kodowania

Backend FastAPI pobiera dane z CodeTime i zapisuje je w Turso.
Panel prezentujący aktywność powstaje w React.

**Status: panel aktywności jest w budowie.**

## Technologie

| Obszar | Technologie |
| --- | --- |
| Interfejs | React, TypeScript, Vite, Tailwind CSS |
| Animacje | GSAP, SplitText, Lenis |
| Grafika 3D | Three.js |
| Tłumaczenia | i18next |
| Backend | Python, FastAPI |
| Baza danych | Turso / SQLite |
| Wdrożenie | Vercel |

## Struktura projektu

```text
api/        Endpointy FastAPI: status, archiwum i ostatnie dni
scripts/    Import i synchronizacja danych z CodeTime
src/        Sekcje, komponenty, tłumaczenia i ikony aplikacji React
public/     Zasoby statyczne
```

## Uruchomienie lokalne

### Frontend

```bash
pnpm install
pnpm dev
```

### Backend

Poniższe polecenia są przeznaczone dla Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1

pip install -r requirementsDev.txt
Copy-Item .env.example .env
```

Uzupełnij konfigurację w `.env`, a następnie wykonaj:

```powershell
python scripts/seedCodetime.py
uvicorn api.index:app --reload --port 8000
```

Frontend w trybie developerskim przekierowuje żądania `/api`
na `http://localhost:8000`.

Bez ustawionych zmiennych Turso backend korzysta z lokalnego pliku
SQLite: `local.db`.

## Konfiguracja środowiska

Skopiuj `.env.example` do `.env` i uzupełnij potrzebne wartości.
Plik `.env` jest ignorowany przez Git.

| Zmienna | Opis | Wartość domyślna / zachowanie |
| --- | --- | --- |
| `CODETIME_TOKEN` | Token odczytu statystyk CodeTime | Do uzupełnienia |
| `TURSO_DATABASE_URL` | Adres bazy Turso | Brak wartości: lokalny `local.db` |
| `TURSO_AUTH_TOKEN` | Token dostępu do Turso | Wymagany przy korzystaniu z Turso |
| `CODETIME_TZ` | Strefa czasowa | `Europe/Warsaw` |
| `SYNC_COOLDOWN_S` | Minimalny odstęp między synchronizacjami | `120` sekund |
| `ACTIVE_HOLD_S` | Czas podtrzymania statusu aktywności po ostatnim zauważonym zdarzeniu | `60` sekund |

Tokeny przechowuj wyłącznie po stronie backendu.
Nie umieszczaj ich w kodzie frontendu ani w publicznym repozytorium.

## Wdrożenie

Projekt jest przygotowany do wdrożenia na Vercel:

- Vite buduje frontend.
- `api/index.py` działa jako funkcja Pythona.
- `vercel.json` zawiera konfigurację wdrożenia.
- Zmienne środowiskowe należy ustawić w panelu projektu Vercel.
