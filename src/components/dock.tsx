import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { gsap } from "../lib/gsap";
import { DOCK, clamp } from "../lib/vortex";

type Spring = { x: number; v: number };

const step = (s: Spring, target: number, k: number, c: number, dt: number) => {
  s.v += (k * (target - s.x) - c * s.v) * dt;
  s.x += s.v * dt;
};

// Animacja wejścia elementów popupu: blok opisu i tagi mają identyczny ruch
const POP = { opacity: 0, y: 6, scale: 0.92 };

function playIn(cur: HTMLElement, delay = 0.05) {
  const title = cur.children[0];
  const blocks = Array.from(cur.querySelectorAll("[data-block]"));
  const chips = Array.from(cur.querySelectorAll("[data-chip]"));

  gsap.killTweensOf([title, ...blocks, ...chips]);
  gsap.fromTo(
    title,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay },
  );
  gsap.fromTo(blocks, POP, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.45,
    ease: "power3.out",
    delay: delay + 0.12,
  });
  gsap.fromTo(chips, POP, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.45,
    ease: "power3.out",
    stagger: 0.05,
    delay: delay + 0.3,
  });
}

type Props = {
  icons: string[];
  images: Record<string, string>;
};

export function Dock({ icons, images }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const popPos = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const sizer = useRef<HTMLDivElement>(null);
  const bodyCur = useRef<HTMLDivElement>(null);
  const bodyPrev = useRef<HTMLDivElement>(null);
  const live = useRef({
    pointerX: null as number | null,
    active: null as number | null,
    last: 0,
    snap: false,
    swap: false,
    dir: 1,
    fromH: 0,
    centers: [] as number[],
    widths: [] as number[],
    leave: 0,
  });

  const select = (i: number | null) => {
    const l = live.current;
    if (l.active === i) return;
    if (l.active === null && i !== null) l.snap = true;

    // przejście między ikonami przy otwartym popupie: zapamiętujemy kierunek
    // i obecną wysokość karty, a poprzednią treść zostawiamy na czas wygaszania
    if (l.active !== null && i !== null && i !== l.last) {
      l.dir = i > l.last ? 1 : -1;
      l.fromH = sizer.current?.offsetHeight ?? 0;
      l.swap = true;
      setPrev(l.last);
    }

    l.active = i;
    setActive(i);
    if (i !== null) {
      l.last = i;
      setShown(i);
    }
  };

  const nearest = () => {
    const l = live.current;
    const px = l.pointerX;
    const n = l.centers.length;
    if (px === null || !n) return null;
    const left = l.centers[0] - l.widths[0] / 2 - 12;
    const right = l.centers[n - 1] + l.widths[n - 1] / 2 + 12;
    if (px < left || px > right) return null;
    let best = 0;
    l.centers.forEach((c, i) => {
      if (Math.abs(px - c) < Math.abs(px - l.centers[best])) best = i;
    });
    return best;
  };

  // wejście i wyjście popupu (przy wejściu treść animuje się warstwami)
  const open = active !== null;
  useEffect(() => {
    gsap.to(
      pop.current,
      open
        ? {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.32,
            ease: "power3.out",
            overwrite: true,
          }
        : {
            opacity: 0,
            scale: 0.96,
            y: 6,
            duration: 0.2,
            ease: "power2.in",
            overwrite: true,
          },
    );
    if (open && bodyCur.current) playIn(bodyCur.current, 0.06);
  }, [open]);

  // płynna zamiana treści: wysokość karty, kierunkowy slajd i animacja tekstu
  // (useLayoutEffect, żeby nowy tekst nie mignął w pełnej widoczności przed animacją)
  useLayoutEffect(() => {
    const l = live.current;
    if (!l.swap) return;
    l.swap = false;

    const card = sizer.current;
    const cur = bodyCur.current;
    const old = bodyPrev.current;
    if (!card || !cur) return;

    // wysokość: od tej, którą karta miała w chwili zamiany, do naturalnej nowej
    gsap.killTweensOf(card);
    card.style.height = "auto";
    const to = card.offsetHeight;
    gsap.fromTo(
      card,
      { height: l.fromH },
      {
        height: to,
        duration: 0.55,
        ease: "power3.out",
        onComplete: () => {
          card.style.height = "";
        },
      },
    );

    // nowa treść wjeżdża z kierunku ruchu kursora, a jej tekst animuje się warstwami
    gsap.killTweensOf(cur);
    gsap.fromTo(
      cur,
      { x: l.dir * 18 },
      { x: 0, duration: 0.6, ease: "power3.out" },
    );
    playIn(cur);

    // stara treść odjeżdża w przeciwną stronę i gaśnie
    if (old) {
      gsap.killTweensOf(old);
      gsap.fromTo(
        old,
        { opacity: 1, x: 0 },
        {
          opacity: 0,
          x: -l.dir * 18,
          duration: 0.24,
          ease: "power2.in",
          onComplete: () => setPrev(null),
        },
      );
    }
  }, [shown]);

  // sprężyny: powiększanie ikon, poszerzanie paska, poświata, pozycja popupu
  useEffect(() => {
    const rootEl = root.current!;
    const items = Array.from(
      rootEl.querySelectorAll<HTMLButtonElement>("[data-slot]"),
    );
    const n = items.length;
    if (!n) return;

    gsap.set(pop.current, {
      opacity: 0,
      scale: 0.94,
      y: 10,
      transformOrigin: "50% 100%",
    });

    let base: { cx: number; w: number }[] = [];
    let gap = 0;
    let padX = 0;
    const measure = () => {
      base = items.map((el) => ({
        cx: el.offsetLeft + el.offsetWidth / 2,
        w: el.offsetWidth,
      }));
      gap =
        n > 1
          ? items[1].offsetLeft - (items[0].offsetLeft + items[0].offsetWidth)
          : 0;
      padX = parseFloat(getComputedStyle(rootEl).paddingLeft);
      if (glow.current) glow.current.style.height = `${base[0].w * 1.1}px`;
      if (bar.current) {
        // wysokość paska jest stała, zmienia się tylko szerokość
        bar.current.style.width = `${rootEl.clientWidth}px`;
        bar.current.style.height = `${rootEl.clientHeight}px`;
      }
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(rootEl);

    const scales: Spring[] = items.map(() => ({ x: 1, v: 0 }));
    const glowX: Spring = { x: 0, v: 0 };
    const glowW: Spring = { x: 0, v: 0 };
    const glowO: Spring = { x: 0, v: 0 };
    const popX: Spring = { x: 0, v: 0 };
    let glowShown = false;

    const l = live.current;

    const tick = (_t: number, ms: number) => {
      const dt = Math.min(ms, 33) / 1000;

      // gdy dock nie jest aktywny (wir jeszcze trwa), czyścimy stan hovera
      if (rootEl.style.pointerEvents !== "auto") {
        l.pointerX = null;
        if (l.active !== null) select(null);
      }
      const px = l.pointerX;

      // 1. powiększanie ikon na sprężynach + przesunięcie sąsiadów
      const w: number[] = [];
      let total = 0;
      for (let i = 0; i < n; i++) {
        const target =
          px === null
            ? 1
            : 1 +
              DOCK.magnify *
                Math.exp(-((px - base[i].cx) ** 2) / (2 * DOCK.sigma ** 2));
        step(scales[i], target, DOCK.stiffness, DOCK.damping, dt);
        w.push(base[i].w * scales[i].x);
        total += w[i];
      }
      total += gap * (n - 1);

      let x = (rootEl.clientWidth - total) / 2;
      const centers: number[] = [];
      for (let i = 0; i < n; i++) {
        const c = x + w[i] / 2;
        centers.push(c);
        items[i].style.transform =
          `translate3d(${c - base[i].cx}px,0,0) scale(${scales[i].x})`;
        x += w[i] + gap;
      }
      l.centers = centers;
      l.widths = w;

      // pasek tylko się poszerza razem z ikonami
      if (bar.current) bar.current.style.width = `${total + padX * 2}px`;

      // 2. miękka poświata pod ikoną ślizga się między ikonami
      const hov = nearest();
      if (hov !== null) {
        const tw = w[hov] * 2.4;
        if (!glowShown) {
          glowX.x = centers[hov];
          glowX.v = 0;
          glowW.x = tw;
          glowW.v = 0;
        }
        step(glowX, centers[hov], 240, 26, dt);
        step(glowW, tw, 240, 26, dt);
      }
      glowShown = hov !== null;
      step(glowO, hov !== null ? 1 : 0, 200, 24, dt);
      if (glow.current) {
        glow.current.style.opacity = String(clamp(glowO.x, 0, 1));
        glow.current.style.width = `${glowW.x}px`;
        glow.current.style.transform = `translate3d(${glowX.x - glowW.x / 2}px,0,0)`;
      }

      // 3. popup ślizga się nad ikonami miękką sprężyną
      const idx = l.active ?? l.last;
      const cx = centers[idx] ?? 0;
      if (l.snap) {
        popX.x = cx;
        popX.v = 0;
        l.snap = false;
      }
      step(popX, cx, 190, 24, dt);
      const pos = popPos.current;
      if (pos) {
        const left = rootEl.getBoundingClientRect().left;
        const popW = pos.offsetWidth;
        const vp = clamp(
          left + popX.x - popW / 2,
          16,
          window.innerWidth - popW - 16,
        );
        pos.style.transform = `translate3d(${vp - left}px,0,0)`;
      }
    };

    // tap poza dockiem zamyka popup (urządzenia dotykowe)
    const onDown = (e: PointerEvent) => {
      if (!rootEl.contains(e.target as Node)) {
        l.pointerX = null;
        select(null);
      }
    };

    gsap.ticker.add(tick);
    window.addEventListener("pointerdown", onDown);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointerdown", onDown);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // treść popupu: pasek tytułu, panel z opisem (słowa jako osobne elementy), tagi
  const body = (i: number) => {
    const id = icons[i];
    const tags =
      (t(`dock.items.${id}.tags`, { returnObjects: true }) as string[]) ?? [];
    return (
      <>
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/4 px-4 py-3">
          {images[id] && (
            <img src={images[id]} alt="" draggable={false} className="size-7" />
          )}
          <span className="text-sm font-medium tracking-tight">
            {t(`dock.items.${id}.title`)}
          </span>
        </div>
        <div className="px-4 pt-4">
          <div
            data-block
            className="rounded-xl border border-white/8 bg-white/3 p-4"
          >
            <p className="text-sm leading-relaxed text-white/75">
              {t(`dock.items.${id}.body`)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pb-4 pt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              data-chip
              className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/55"
            >
              {tag}
            </span>
          ))}
        </div>
      </>
    );
  };

  return (
    <div
      ref={root}
      data-dock
      className="pointer-events-none fixed bottom-[max(2.2vh,env(safe-area-inset-bottom))] left-1/2 z-50 flex h-[calc(var(--ic)*1.5+12px)] -translate-x-1/2 items-center gap-(--gap) px-(--pad)"
      style={
        {
          "--ic": DOCK.size,
          "--gap": DOCK.gap,
          "--pad": DOCK.pad,
        } as CSSProperties
      }
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const l = live.current;
        window.clearTimeout(l.leave);
        l.pointerX = e.clientX - root.current!.getBoundingClientRect().left;
        select(nearest());
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        const l = live.current;
        l.pointerX = null;
        window.clearTimeout(l.leave);
        l.leave = window.setTimeout(() => select(null), 140);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          live.current.pointerX = null;
          select(null);
        }
      }}
    >
      {/* poświata pod paskiem, zapala się przy lądowaniu ikon */}
      <div
        className="pointer-events-none absolute -inset-x-5 -bottom-3 h-12 rounded-full blur-xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(124,92,255,0.6), transparent)",
          opacity: "var(--glow, 0)",
        }}
      />

      {/* szklany pasek: stała wysokość, szerokość ustawia sprężyna w tick() */}
      <div
        ref={bar}
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[22px] border border-white/12 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        style={{ opacity: "var(--bar, 0)" }}
      />

      {/* miękka poświata pod hoverowaną ikoną */}
      <div
        ref={glow}
        className="pointer-events-none absolute bottom-[2px] left-0 opacity-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.20), rgba(124,92,255,0.10) 55%, transparent)",
        }}
      />

      {/* podpowiedź (znika, gdy popup jest otwarty) */}
      <p
        className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+12px)] text-center text-[11px] uppercase tracking-[0.25em] text-white/35"
        style={{ opacity: "var(--bar, 0)" }}
      >
        <span
          className="block transition-opacity duration-300"
          style={{ opacity: open ? 0 : 1 }}
        >
          {t("dock.hint")}
        </span>
      </p>

      {icons.map((name, i) => (
        <button
          key={name}
          data-slot
          data-cursor="plain"
          type="button"
          aria-label={t(`dock.items.${name}.title`)}
          className="relative z-10 block size-(--ic) shrink-0 origin-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          onFocus={() => {
            const l = live.current;
            l.pointerX = l.centers[i] ?? null;
            select(i);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== "touch") return;
            const l = live.current;
            l.pointerX = l.centers[i] ?? null;
            select(l.active === i ? null : i);
          }}
        >
          {images[name] && (
            <img
              src={images[name]}
              alt=""
              draggable={false}
              className="size-full select-none"
              style={{ opacity: "var(--icons, 0)" }}
            />
          )}
        </button>
      ))}

      {/* popup w stylu podglądu okna z paska zadań Windows 11 */}
      <div
        ref={popPos}
        className="pointer-events-none absolute bottom-[calc(100%+16px)] left-0 w-88 max-w-[calc(100vw-2rem)]"
      >
        <div
          ref={pop}
          className="relative overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,6,8,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 42%)",
            }}
          />
          {/* sizer: tu animuje się wysokość karty między różnymi opisami */}
          <div ref={sizer} className="relative overflow-hidden">
            {prev !== null && prev !== shown && (
              <div ref={bodyPrev} className="absolute inset-x-0 top-0">
                {body(prev)}
              </div>
            )}
            <div ref={bodyCur} className="relative">
              {body(shown)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
