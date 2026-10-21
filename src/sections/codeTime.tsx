import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Reveal } from "../components/reveal";
import { Fade } from "../components/fade";
import { CountUp } from "../components/countUp";
import { RangeSelect } from "../components/rangeSelect";
import { ActivityGrid } from "../components/activityGrid";
import { Icon } from "../components/icons";
import { useCodeTime } from "../lib/useCodeTime";
import { useSectionHold } from "../lib/useSectionHold";
import { formatMinutes } from "../lib/formatTime";
import {
  DEFAULT_PRESET,
  PRESETS,
  buildWeeks,
  canStep,
  resolveRange,
  streaks,
  sumRange,
  type DayEntry,
  type PresetKey,
} from "../lib/activity";

function relativeTime(from: number, now: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.max(1, Math.round((now - from) / 60_000));
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

function BlockHeader({
  icon,
  title,
  caption,
  children,
}: {
  icon: "calendar" | "activity";
  title: string;
  caption: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.035] px-6 py-3.5">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Icon name={icon} className="size-4 text-white/60" />
        {title}
      </div>
      <div className="flex items-center gap-4">
        {children}
        <span className="hidden font-mono text-[11px] text-white/35 sm:block">
          {caption}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-black/60 px-6 py-5">
      <div className="text-sm text-sky-400">{label}</div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight md:text-[22px]">
        {children}
      </div>
    </div>
  );
}

export function CodeTime() {
  const { t, i18n } = useTranslation();
  const root = useRef<HTMLElement>(null);
  useSectionHold(root);

  // dane odświeżamy tylko wtedy, gdy sekcja jest widoczna
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      {
        rootMargin: "200px 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { archive, status, failed, today } = useCodeTime(visible);

  const [preset, setPreset] = useState<PresetKey>(DEFAULT_PRESET);
  const [steps, setSteps] = useState(0);

  const since = archive?.since ?? today;
  const range = useMemo(
    () => resolveRange(preset, steps, today, since),
    [preset, steps, today, since],
  );
  const byDate = useMemo(
    () =>
      new Map<string, DayEntry>(
        (archive?.days ?? []).map((day) => [day.date, day]),
      ),
    [archive],
  );
  const weeks = useMemo(() => buildWeeks(today), [today]);
  const total = useMemo(() => sumRange(byDate, range), [byDate, range]);
  const { current, largest } = useMemo(
    () => streaks(byDate, today),
    [byDate, today],
  );
  const todayMinutes = byDate.get(today)?.total ?? 0;

  const options = PRESETS.map((key) => ({
    key,
    label: t(`activity.presets.${key}`),
  }));
  const weekdays = t("activity.weekdays", { returnObjects: true }) as string[];
  const lastActive =
    status?.lastEventAt != null
      ? relativeTime(status.lastEventAt, status.serverTime, i18n.language)
      : null;

  const formatDays = (value: number) =>
    t("activity.dayCount", { count: value });
  const formatTime = (value: number) => formatMinutes(value, t);

  return (
    <section
      ref={root}
      data-hold
      className="relative z-30 flex min-h-screen flex-col justify-center px-6 pb-40 pt-16 md:px-16"
    >
      <div className="mx-auto w-full max-w-5xl">
        <Fade>
          <Reveal
            as="p"
            text={t("activity.eyebrow")}
            className="mb-4 text-sm uppercase tracking-[0.3em] text-white/50"
          />
          <Reveal
            as="h2"
            text={t("activity.title")}
            className="mb-10 text-4xl font-semibold tracking-tight md:text-6xl"
          />
        </Fade>

        <Fade className="relative z-40 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl">
          <div>
            <div className="hatch h-6 border-b border-white/10 rounded-t-2xl overflow-hidden" />

            <BlockHeader
              icon="calendar"
              title={t("activity.dateRange")}
              caption={t("activity.dateRangeCaption")}
            />
            <div className="px-6 py-5">
              <RangeSelect
                options={options}
                value={preset}
                rangeText={`${range.from} → ${range.to}`}
                canPrev={canStep(preset, steps, -1, today, since)}
                canNext={canStep(preset, steps, 1, today, since)}
                prevLabel={t("activity.prev")}
                nextLabel={t("activity.next")}
                onSelect={(key) => {
                  setPreset(key);
                  setSteps(0);
                }}
                onStep={(direction) => setSteps((s) => s + direction)}
              />
            </div>

            <div className="hatch h-6 border-y border-white/10" />

            <BlockHeader
              icon="activity"
              title={t("activity.activityTitle")}
              caption={t("activity.activityCaption")}
            >
              {status?.active ? (
                <span className="flex items-center gap-2 text-xs text-sky-300">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400/70" />
                    <span className="relative inline-flex size-2 rounded-full bg-sky-400" />
                  </span>
                  {t("activity.codingNow")}
                </span>
              ) : lastActive ? (
                <span className="text-xs text-white/40">
                  {t("activity.lastActive", { when: lastActive })}
                </span>
              ) : null}
            </BlockHeader>

            {failed && !archive ? (
              <p className="px-6 py-10 text-sm text-white/50">
                {t("activity.error")}
              </p>
            ) : (
              <>
                <div className="relative z-10 grid grid-cols-2 gap-px border-b border-white/10 bg-white/10 md:grid-cols-4">
                  <Stat label={t("activity.timeTotal")}>
                    <CountUp value={total} format={formatTime} />
                  </Stat>
                  <Stat label={t("activity.timeToday")}>
                    <CountUp value={todayMinutes} format={formatTime} />
                  </Stat>
                  <Stat label={t("activity.streakCurrent")}>
                    <CountUp value={current} format={formatDays} />
                  </Stat>
                  <Stat label={t("activity.streakLargest")}>
                    <CountUp value={largest} format={formatDays} />
                  </Stat>
                </div>

                <div className="relative z-20">
                  <ActivityGrid
                    weeks={weeks}
                    byDate={byDate}
                    range={range}
                    weekdays={weekdays}
                  />
                </div>

                {archive?.since && (
                  <p className="px-6 pb-5 font-mono text-[11px] text-white/35">
                    {t("activity.trackingSince", { date: archive.since })}
                  </p>
                )}
              </>
            )}

            <div className="hatch h-6 border-t border-white/10 rounded-b-2xl overflow-hidden" />
          </div>
        </Fade>
      </div>
    </section>
  );
}
