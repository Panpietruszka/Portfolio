import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import { useTranslation } from "react-i18next";
import { gsap, ScrollTrigger } from "../lib/gsap";
import {
  LEVEL_COLORS,
  OFF_COLOR,
  levelOf,
  toUtc,
  topLanguages,
  type DayEntry,
  type Range,
} from "../lib/activity";
import { formatMinutes } from "../lib/formatTime";

type CellsProps = {
  weeks: (string | null)[][];
  byDate: Map<string, DayEntry>;
  range: Range;
};

const Cells = memo(function Cells({ weeks, byDate, range }: CellsProps) {
  return (
    <>
      {weeks.flatMap((week, col) =>
        week.map((date, row) => {
          if (!date) return <div key={`f-${col}-${row}`} className="size-3" />;
          const minutes = byDate.get(date)?.total ?? 0;
          const inRange = date >= range.from && date <= range.to;
          const color = inRange ? LEVEL_COLORS[levelOf(minutes)] : OFF_COLOR;
          return (
            <div
              key={date}
              data-date={date}
              data-col={col}
              className="size-3 rounded-[3px] transition-colors duration-500"
              style={{
                backgroundColor: color,
                transitionDelay: `${col * 6}ms`,
              }}
            />
          );
        }),
      )}
    </>
  );
});

type Props = {
  weeks: (string | null)[][];
  byDate: Map<string, DayEntry>;
  range: Range;
  weekdays: string[];
};

export function ActivityGrid({ weeks, byDate, range, weekdays }: Props) {
  const { t, i18n } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tipVisible = useRef(false);
  const [tipDate, setTipDate] = useState<string | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  useGSAP(
    () => {
      const el = grid.current;
      if (!el) return;
      const cells = Array.from(el.querySelectorAll<HTMLElement>("[data-date]"));
      if (!cells.length) return;

      const tween = gsap.fromTo(
        cells,
        { opacity: 0, scale: 0.4 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.8)",
          delay: (_index: number, target: HTMLElement) =>
            Number(target.dataset.col) * 0.011,
          paused: true,
        },
      );
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        onEnter: () => tween.play(),
      });
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        onLeaveBack: () => tween.pause(0),
      });
    },
    { scope: wrap, dependencies: [weeks] },
  );

  useEffect(() => {
    const el = tip.current;
    if (!el) return;
    gsap.set(el, { xPercent: -50, yPercent: -100, opacity: 0, scale: 0.92 });
  }, []);

  // Luksusowa animacja zmiany wysokości karty oraz miękkiego wyłaniania się wartości
  useLayoutEffect(() => {
    const container = tip.current;
    const content = contentRef.current;
    if (!container || !content || !tipVisible.current) return;

    // Pobieramy nową naturalną wysokość zawartości okienka
    const targetHeight = content.offsetHeight;

    // Płynne dopasowanie wysokości okienka (height transition z eksponencjalnym wygładzeniem)
    gsap.to(container, {
      height: targetHeight,
      duration: 0.32,
      ease: "power3.out",
      overwrite: "auto",
    });

    // Subtelna, elegancka animacja odświeżenia wartości/liczb przy zmianie dnia
    gsap.fromTo(
      content,
      { opacity: 0.5, y: 3 },
      { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
    );
  }, [tipDate]);

  const hide = () => {
    if (!tipVisible.current) return;
    tipVisible.current = false;
    gsap.to(tip.current, {
      opacity: 0,
      scale: 0.92,
      duration: 0.18,
      ease: "power2.in",
      overwrite: "auto",
    });
  };

  const show = (target: EventTarget | null) => {
    const cell = (target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-date]",
    );
    const el = tip.current;
    if (!cell || !el) {
      hide();
      return;
    }

    const rect = cell.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top - 12;

    if (!tipVisible.current) {
      // Pierwsze pojawienie się w miejscu punktu
      gsap.set(el, { x: targetX, y: targetY });
      tipVisible.current = true;
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration: 0.22,
        ease: "back.out(1.5)",
        overwrite: "auto",
      });
    } else {
      // Płynny, sprężysty ślizg między kafelkami
      gsap.to(el, {
        x: targetX,
        y: targetY,
        opacity: 1,
        scale: 1,
        duration: 0.28,
        ease: "power3.out",
        overwrite: "auto",
      });
    }

    setTipDate(cell.dataset.date ?? null);
  };

  const entry = tipDate ? byDate.get(tipDate) : undefined;
  const dateLabel = tipDate
    ? new Intl.DateTimeFormat(i18n.language, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(toUtc(tipDate)))
    : "";

  return (
    <div
      ref={scroller}
      className="overflow-x-auto px-6 pb-4 pt-10 [scrollbar-width:none]"
    >
      <div ref={wrap} className="relative mx-auto w-max">
        <div className="flex gap-3">
          <div className="grid grid-rows-7 gap-[3px]">
            {weekdays.map((day) => (
              <span
                key={day}
                className="flex h-3 w-8 items-center font-mono text-[11px] leading-none text-white/55"
              >
                {day}
              </span>
            ))}
          </div>

          <div
            ref={grid}
            className="grid grid-flow-col grid-rows-7 gap-[3px]"
            onPointerMove={(e) => show(e.target)}
            onPointerDown={(e) => show(e.target)}
            onPointerLeave={hide}
          >
            <Cells weeks={weeks} byDate={byDate} range={range} />
          </div>
        </div>
      </div>

      {createPortal(
        <div
          ref={tip}
          className="pointer-events-none fixed left-0 top-0 z-[9999] w-52 overflow-hidden rounded-xl border border-white/12 bg-[rgba(6,6,8,0.96)] shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
        >
          <div ref={contentRef} className="px-3 py-2.5">
            <div className="text-[11px] text-white/50">{dateLabel}</div>
            <div className="mt-1 text-sm font-medium">
              {entry ? formatMinutes(entry.total, t) : t("activity.noActivity")}
            </div>
            {entry && (
              <div className="mt-2 space-y-0.5 font-mono text-[11px] text-white/60">
                {topLanguages(entry, 3).map(([language, minutes]) => (
                  <div key={language} className="flex justify-between gap-3">
                    <span>{language}</span>
                    <span>{formatMinutes(minutes, t)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
