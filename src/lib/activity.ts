export type DayEntry = {
  date: string;
  total: number;
  languages: Record<string, number>;
};

export type Archive = {
  timezone: string;
  since: string | null;
  updatedAt: number | null;
  days: DayEntry[];
};

export type Status = {
  active: boolean;
  lastEventAt: number | null;
  serverTime: number;
};

export type Range = { from: string; to: string };

export const PRESETS = [
  "today",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "past7",
  "past30",
  "past90",
  "yearToDate",
  "allTime",
] as const;
export type PresetKey = (typeof PRESETS)[number];

export const DEFAULT_PRESET: PresetKey = "allTime";
export const DEFAULT_TZ = "Europe/Warsaw";

const WEEK_STARTS_ON = 1; // 1 = poniedziałek, 0 = niedziela (zakresy This week / Last week)
const DAY_MS = 86_400_000;
const ROLLING = { past7: 7, past30: 30, past90: 90 } as const;

// --- daty (ISO "RRRR-MM-DD", liczone w UTC, żeby strefa przeglądarki nie przesuwała dni) ---

export const toUtc = (iso: string): number => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

export const fromUtc = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string =>
  fromUtc(toUtc(iso) + days * DAY_MS);

export const weekday = (iso: string): number =>
  new Date(toUtc(iso)).getUTCDay(); // 0 = niedziela

export const todayIn = (timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());

// --- zakresy ---

const startOfWeek = (iso: string): string =>
  addDays(iso, -((weekday(iso) - WEEK_STARTS_ON + 7) % 7));

const monthRange = (iso: string, steps: number): Range => {
  const [year, month] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + steps, 1));
  const last = new Date(Date.UTC(year, month + steps, 0));
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
};

function baseRange(
  preset: PresetKey,
  steps: number,
  today: string,
  since: string,
): Range {
  switch (preset) {
    case "today": {
      const day = addDays(today, steps);
      return { from: day, to: day };
    }
    case "thisWeek": {
      const from = addDays(startOfWeek(today), steps * 7);
      return { from, to: addDays(from, 6) };
    }
    case "lastWeek": {
      const from = addDays(startOfWeek(today), (steps - 1) * 7);
      return { from, to: addDays(from, 6) };
    }
    case "thisMonth":
      return monthRange(today, steps);
    case "lastMonth":
      return monthRange(today, steps - 1);
    case "past7":
    case "past30":
    case "past90": {
      // tak jak w CodeTime: okno od (dziś - N) do dziś
      const n = ROLLING[preset];
      const to = addDays(today, steps * (n + 1));
      return { from: addDays(to, -n), to };
    }
    case "yearToDate":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "allTime":
      return { from: since, to: today };
  }
}

export function resolveRange(
  preset: PresetKey,
  steps: number,
  today: string,
  since: string,
): Range {
  const range = baseRange(preset, steps, today, since);
  return { from: range.from, to: range.to > today ? today : range.to };
}

export function canStep(
  preset: PresetKey,
  steps: number,
  direction: -1 | 1,
  today: string,
  since: string,
): boolean {
  if (preset === "yearToDate" || preset === "allTime") return false;
  const next = baseRange(preset, steps + direction, today, since);
  return direction > 0 ? next.from <= today : next.to >= since;
}

// --- statystyki ---

export function sumRange(byDate: Map<string, DayEntry>, range: Range): number {
  let total = 0;
  for (let day = range.from; day <= range.to; day = addDays(day, 1)) {
    total += byDate.get(day)?.total ?? 0;
  }
  return total;
}

export function streaks(byDate: Map<string, DayEntry>, today: string) {
  const dates = [...byDate.keys()]
    .filter((d) => (byDate.get(d)?.total ?? 0) > 0)
    .sort();

  let largest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    largest = Math.max(largest, run);
    previous = date;
  }

  // seria trwa, jeśli dziś albo wczoraj była aktywność
  let current = 0;
  let cursor = (byDate.get(today)?.total ?? 0) > 0 ? today : addDays(today, -1);
  while ((byDate.get(cursor)?.total ?? 0) > 0) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, largest };
}

export function topLanguages(
  entry: DayEntry,
  limit: number,
): [string, number][] {
  return Object.entries(entry.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

// --- siatka ---

// kolory poziomów 0-4 (0 = dzień w zakresie bez aktywności), odcienie z dashboardu CodeTime
export const LEVEL_COLORS = [
  "#16222f",
  "#12385c",
  "#1a5c96",
  "#2379c8",
  "#3aa0ff",
];
export const OFF_COLOR = "rgba(255,255,255,0.045)"; // dni poza wybranym zakresem

export function levelOf(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes >= 90) return 4;
  if (minutes >= 50) return 3;
  if (minutes >= 20) return 2;
  return 1;
}

// 53 tygodnie kończące się dziś; każdy tydzień to 7 dni od niedzieli, przyszłe dni = null
export function buildWeeks(today: string, weeks = 53): (string | null)[][] {
  const lastSunday = addDays(today, -weekday(today));
  const firstSunday = addDays(lastSunday, -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(firstSunday, week * 7 + day);
      return date > today ? null : date;
    }),
  );
}
