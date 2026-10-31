import { useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Reveal } from "../components/reveal";
import { Fade } from "../components/fade";
import { ProjectCard } from "../components/projectCard";
import { useSectionHold } from "../lib/useSectionHold";
import { PROJECTS } from "../lib/projects";

// Układ bento: dwie kolumny, wysokość liczona w jednostkach wiersza.
// Lewa: wysoki (5) + niski (4). Prawa: niski (4) + wysoki (5). Blok ma 9 wierszy i powtarza się co 4 projekty.
const SLOTS = [
  { col: 1, row: 1, span: 5 },
  { col: 2, row: 1, span: 4 },
  { col: 1, row: 6, span: 4 },
  { col: 2, row: 5, span: 5 },
] as const;
const ROWS_PER_BLOCK = 9;

// Wiersz = ułamek szerokości kolumny, dzięki czemu proporcje kafli są takie same na każdej szerokości.
// Większa wartość = wyższe kafle (0,1373 daje ok. 1,46:1 dla wysokiego i ok. 2:1 dla niskiego).
const ROW_RATIO = 0.1373;

function slotStyle(index: number): CSSProperties {
  const slot = SLOTS[index % SLOTS.length];
  const row = slot.row + Math.floor(index / SLOTS.length) * ROWS_PER_BLOCK;
  return {
    "--c": String(slot.col),
    "--r": `${row} / span ${slot.span}`,
  } as CSSProperties;
}

export function Projects() {
  const { t } = useTranslation();
  const root = useRef<HTMLElement>(null);
  useSectionHold(root);
  const [active, setActive] = useState<number | null>(null);

  return (
    <section ref={root} data-hold className="relative px-6 py-32 md:px-16">
      <div className="mx-auto max-w-6xl">
        <Fade>
          <Reveal
            as="p"
            text={t("projects.eyebrow")}
            className="mb-4 text-sm uppercase tracking-[0.3em] text-white/50"
          />
          <Reveal
            as="h2"
            text={t("projects.title")}
            className="mb-12 text-4xl font-semibold tracking-tight md:mb-16 md:text-6xl"
          />
        </Fade>

        <div
          className="grid grid-cols-1 gap-x-4 gap-y-10 md:auto-rows-[calc(var(--col)*var(--row-ratio))] md:grid-cols-2 md:gap-y-4"
          style={
            {
              // szerokość jednej kolumny: (szerokość treści - odstęp) / 2
              "--col": "calc((min(100vw - 8rem, 72rem) - 1rem) / 2)",
              "--row-ratio": String(ROW_RATIO),
            } as CSSProperties
          }
          onPointerLeave={() => setActive(null)}
        >
          {PROJECTS.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              style={slotStyle(index)}
              focused={active === index}
              dimmed={active !== null && active !== index}
              onActivate={setActive}
              onDeactivate={() => setActive(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
