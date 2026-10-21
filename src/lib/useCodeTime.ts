import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_TZ,
  addDays,
  todayIn,
  type Archive,
  type DayEntry,
  type Status,
} from "./activity";

const STATUS_EVERY_MS = 8_000; // jak często pytamy, czy właśnie kodujesz
const RECENT_EVERY_MS = 150_000; // jak często dociągamy dane, gdy kodujesz
const RECENT_DAYS = 3;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return (await response.json()) as T;
}

// "recent" jest źródłem prawdy dla dni od sinceDate, więc zastępuje je w całości
function mergeRecent(
  days: DayEntry[],
  recent: DayEntry[],
  sinceDate: string,
): DayEntry[] {
  const byDate = new Map(
    days.filter((d) => d.date < sinceDate).map((d) => [d.date, d]),
  );
  for (const day of recent) byDate.set(day.date, day);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function useCodeTime(enabled: boolean) {
  const [archive, setArchive] = useState<Archive | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  const wasActive = useRef(false);

  const tz = archive?.timezone ?? DEFAULT_TZ;
  const [today, setToday] = useState(() => todayIn(DEFAULT_TZ));
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayIn(tz)), 60_000);
    return () => window.clearInterval(id);
  }, [tz]);

  // całe archiwum raz
  useEffect(() => {
    const controller = new AbortController();
    getJson<Archive>("/api/codetime/archive", controller.signal)
      .then(setArchive)
      .catch((error: Error) => {
        if (error.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const refreshRecent = useCallback(async () => {
    try {
      const recent = await getJson<{
        updatedAt: number | null;
        days: DayEntry[];
      }>(`/api/codetime/recent?days=${RECENT_DAYS}`);
      setArchive((previous) => {
        if (!previous) return previous;
        const since = addDays(todayIn(previous.timezone), -RECENT_DAYS);
        return {
          ...previous,
          updatedAt: recent.updatedAt ?? previous.updatedAt,
          days: mergeRecent(previous.days, recent.days, since),
        };
      });
    } catch {
      // zostajemy przy danych, które już mamy
    }
  }, []);

  // status: tylko gdy sekcja jest widoczna i karta aktywna
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await getJson<Status>("/api/codetime/status");
        if (stopped) return;
        setStatus(next);
        // zaczynasz lub kończysz pisać: dociągamy dane od razu
        if (next.active !== wasActive.current) void refreshRecent();
        wasActive.current = next.active;
      } catch {
        // pomijamy, spróbujemy za chwilę
      }
    };

    void poll();
    const id = window.setInterval(poll, STATUS_EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [enabled, refreshRecent]);

  // dane co kilka minut, ale tylko podczas pisania
  const active = status?.active ?? false;
  useEffect(() => {
    if (!enabled || !active) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRecent();
    }, RECENT_EVERY_MS);
    return () => window.clearInterval(id);
  }, [enabled, active, refreshRecent]);

  return { archive, status, failed, today };
}
