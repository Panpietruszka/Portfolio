import type { TFunction } from "i18next";

// "70 hrs 54 mins", "1 hr 3 mins", "5 mins" (liczby mnogie obsługuje i18next)
export function formatMinutes(minutes: number, t: TFunction): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const mins = t("activity.minuteCount", { count: rest });
  return hours > 0
    ? `${t("activity.hourCount", { count: hours })} ${mins}`
    : mins;
}
