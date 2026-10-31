import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import { useTranslation } from "react-i18next";
import { gsap, ScrollTrigger } from "../lib/gsap";
import type { Project } from "../lib/projects";

type Props = {
  project: Project;
  index: number;
  style: CSSProperties; // pozycja w siatce bento (zmienne --c i --r)
  focused: boolean; // nad tą kartą jest kursor
  dimmed: boolean; // kursor jest nad inną kartą
  onActivate: (index: number) => void;
  onDeactivate: () => void;
};

const RADIUS = 28;

export function ProjectCard({
  project,
  index,
  style,
  focused,
  dimmed,
  onActivate,
  onDeactivate,
}: Props) {
  const { t } = useTranslation();
  const card = useRef<HTMLDivElement>(null); // komórka siatki (wejście ze scrolla)
  const lift = useRef<HTMLDivElement>(null); // kafel + podpis (hover)
  const [missing, setMissing] = useState(false);

  // wejście: kafel otwiera się jak kadr filmowy, zrzut się osadza, teksty wysuwają się spod maski
  useGSAP(
    () => {
      const el = card.current;
      if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const frame = el.querySelector<HTMLElement>("[data-frame]");
      const shot = el.querySelector<HTMLElement>("[data-shot]");
      const lines = el.querySelectorAll<HTMLElement>("[data-line]");
      if (!frame) return;

      const tl = gsap.timeline({
        paused: true,
        delay: (index % 2) * 0.14, // prawa kolumna wchodzi chwilę po lewej
        // po wejściu zdejmujemy maskę, żeby nie przycinała cienia kafla
        onComplete: () => {
          gsap.set(frame, { clearProps: "clipPath" });
        },
      });
      tl.fromTo(
        frame,
        {
          opacity: 0,
          clipPath: `inset(46% 0% 46% 0% round ${RADIUS}px)`,
        },
        {
          opacity: 1,
          clipPath: `inset(0% 0% 0% 0% round ${RADIUS}px)`,
          duration: 1.5,
          ease: "expo.out",
        },
        0,
      );
      if (shot) {
        tl.fromTo(
          shot,
          { scale: 1.12 },
          { scale: 1, duration: 2, ease: "expo.out" },
          0,
        );
      }
      tl.fromTo(
        lines,
        { yPercent: 110 },
        { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.08 },
        0.5,
      );

      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        onEnter: () => tl.play(),
      });
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        onLeaveBack: () => tl.pause(0),
      });
    },
    { scope: card },
  );

  // wyróżnienie najechanej karty i wyciszenie pozostałych
  useEffect(() => {
    const el = lift.current;
    if (!el) return;
    gsap.to(el, {
      y: focused ? -6 : 0,
      scale: focused ? 1.012 : dimmed ? 0.99 : 1,
      opacity: dimmed ? 0.45 : 1,
      duration: 0.8,
      ease: "power3.out",
      overwrite: "auto",
    });
  }, [focused, dimmed]);

  const number = String(index + 1).padStart(2, "0");

  return (
    <div
      ref={card}
      style={style}
      className="relative min-h-0 md:[grid-column:var(--c)] md:[grid-row:var(--r)]"
      onPointerEnter={(e) => e.pointerType === "mouse" && onActivate(index)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onDeactivate()}
    >
      <div
        ref={lift}
        className="flex h-full flex-col"
        style={{ willChange: "transform" }}
      >
        {/* kafel: rozmyte tło z tego samego zrzutu + zrzut w całości (bez przycinania) */}
        <div
          data-frame
          className={`relative aspect-[16/10] min-h-0 overflow-hidden border bg-[#0d0d11] transition-colors duration-700 md:aspect-auto md:flex-1 ${
            focused ? "border-white/25" : "border-white/10"
          }`}
          style={{
            borderRadius: RADIUS,
            boxShadow: "0 28px 70px -34px rgba(0,0,0,0.95)",
          }}
        >
          {!missing && (
            <img
              src={project.image}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-50 blur-2xl saturate-150"
            />
          )}
          <div className="absolute inset-0 bg-black/30" />

          <div
            data-shot
            className="absolute inset-0 flex items-center justify-center p-3.5"
          >
            {!missing && (
              <img
                src={project.image}
                alt={t("projects.alt", { name: project.name })}
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={() => setMissing(true)}
                className={`max-h-full max-w-full rounded-xl object-contain shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-transform duration-[1400ms] ease-out ${
                  focused ? "scale-[1.03]" : "scale-100"
                }`}
              />
            )}
          </div>
        </div>

        {/* podpis pod kaflem: numer, nazwa, jedno zdanie i stack */}
        <div className="shrink-0 pt-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <div className="overflow-hidden">
              <span
                data-line
                className={`block text-lg font-medium tracking-tight transition-colors duration-500 ${
                  focused ? "text-white" : "text-white/90"
                }`}
              >
                <span className="mr-3 font-mono text-[11px] text-white/35">
                  {number}
                </span>
                {project.name}
              </span>
            </div>
            <div className="hidden overflow-hidden sm:block">
              <span
                data-line
                className={`block font-mono text-[11px] transition-colors duration-500 ${
                  focused ? "text-white/70" : "text-white/40"
                }`}
              >
                {project.stack.join(" · ")}
              </span>
            </div>
          </div>
          <div className="overflow-hidden">
            <span
              data-line
              className={`block truncate text-sm transition-colors duration-500 ${
                focused ? "text-white/70" : "text-white/45"
              }`}
            >
              {t(`projects.items.${project.id}.summary`)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
