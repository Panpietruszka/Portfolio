import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";

const COLORS = {
  violet: "124 92 255",
  blue: "47 107 255",
  magenta: "214 66 255",
  teal: "24 200 176",
  cyan: "80 200 255",
};

type Blob = {
  rgb: string;
  size: number; // vmax
  alpha: number; // jasność środka plamy
  depth: number; // 0-1: jak mocno plama reaguje na światło przy kursorze (paralaksa)
  period: number; // s: okres głównego ruchu dryfu
  sway: [number, number]; // vw, vh: amplituda dryfu
  breathe: number; // amplituda oddychania skali
  x: number[]; // vw: pozycja (lewy górny róg) w sekcjach: hero, o mnie, wir, CodeTime
  y: number[]; // vh
  o: number[]; // jasność w kolejnych sekcjach
};

const BLOBS: Blob[] = [
  {
    rgb: COLORS.violet,
    size: 72,
    alpha: 0.7,
    depth: 0.35,
    period: 28,
    sway: [4, 3],
    breathe: 0.12,
    x: [-14, 24, -6, 34],
    y: [-29, -17, 3, -7],
    o: [1, 0.7, 0.85, 0.6],
  },
  {
    rgb: COLORS.blue,
    size: 62,
    alpha: 0.62,
    depth: 0.55,
    period: 33,
    sway: [5, 4],
    breathe: 0.1,
    x: [51, -11, 44, 4],
    y: [-25, 5, -15, 15],
    o: [0.55, 0.75, 0.8, 0.6],
  },
  {
    rgb: COLORS.magenta,
    size: 58,
    alpha: 0.55,
    depth: 0.75,
    period: 24,
    sway: [3.5, 5],
    breathe: 0.14,
    x: [26, 56, -14, 31],
    y: [44, 24, -6, -16],
    o: [0.35, 0.5, 0.6, 0.5],
  },
  {
    rgb: COLORS.teal,
    size: 56,
    alpha: 0.5,
    depth: 0.5,
    period: 31,
    sway: [4.5, 3.5],
    breathe: 0.1,
    x: [58, -18, 22, -8],
    y: [-13, 40, 45, -5],
    o: [0.55, 0.4, 0.5, 0.55],
  },
  {
    rgb: COLORS.cyan,
    size: 34,
    alpha: 0.5,
    depth: 1,
    period: 19,
    sway: [6, 5],
    breathe: 0.18,
    x: [52, 6, 58, 14],
    y: [-12, 18, 42, 8],
    o: [0.4, 0.45, 0.5, 0.4],
  },
];

// barwy światła przy kursorze i ich "kotwice" na ekranie (0-1)
const LIGHT = [
  { rgb: COLORS.violet, x: 0.12, y: 0.2 },
  { rgb: COLORS.magenta, x: 0.5, y: 0.5 },
  { rgb: COLORS.blue, x: 0.9, y: 0.25 },
  { rgb: COLORS.teal, x: 0.5, y: 0.95 },
];
const LIGHT_RGB = LIGHT.map((l) => l.rgb.split(" ").map(Number));

// ---------- strojenie ----------
const TUNING = {
  parallax: 70, // px: maks. przesunięcie najgłębszej plamy pod wpływem światła
  idleMs: 2800, // po tylu ms bez ruchu myszy światło zaczyna wędrować samo
  scrollLag: 3.2, // jak szybko tło dogania scroll (większe = żywiej)
  // sprężyny: k = sztywność, c = tłumienie. Im mniejsze k, tym większa bezwładność.
  tight: { size: 300, alpha: 0.55, k: 620, c: 48 },
  core: { size: 760, alpha: 0.4, k: 170, c: 22 },
  halo: { size: 1700, alpha: 0.2, k: 48, c: 11 },
};

// pył rozświetlany przez światło (ustaw count na 0, żeby go wyłączyć)
const DUST = {
  count: 90,
  speed: 5, // px/s dla najbliższej warstwy
  lightRadius: 540, // px: zasięg rozświetlania
  idle: 0.2, // jasność pyłu poza światłem
  lit: 0.85, // dodatkowa jasność w świetle
};

const PULSE = 900; // px: rozmiar fali światła przy kliknięciu
const BASE = "#05060b";

// słabszy sprzęt: bez mieszania screen, dryfu i pyłu (dodatkowo jest też adaptacja w locie)
const LITE =
  typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;

// ---------- pomocnicze ----------
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Radialny gradient o gaussowskim spadku jasności: zero na krawędzi, brak pasm i krawędzi
function glow(rgb: string, alpha: number, stops = 16): string {
  const parts: string[] = [];
  for (let i = 0; i <= stops; i++) {
    const t = i / stops; // 0 = środek, 1 = krawędź
    const a = alpha * Math.exp(-4.2 * t * t) * (1 - t ** 6);
    parts.push(`rgb(${rgb} / ${a.toFixed(4)}) ${(t * 100).toFixed(1)}%`);
  }
  return `radial-gradient(closest-side, ${parts.join(", ")})`;
}

// Gładka krzywa przez punkty kluczowe (Catmull-Rom), u w [0, 1]
function sample(values: number[], u: number): number {
  const n = values.length - 1;
  const f = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const p0 = values[Math.max(0, i - 1)];
  const p1 = values[i];
  const p2 = values[i + 1];
  const p3 = values[Math.min(n, i + 2)];
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}

type Mass = { x: number; y: number; vx: number; vy: number };
const makeMass = (x: number, y: number): Mass => ({ x, y, vx: 0, vy: 0 });

// Sprężyna z podkrokami (stabilna także przy dłuższych klatkach)
function spring(
  m: Mass,
  tx: number,
  ty: number,
  k: number,
  c: number,
  dt: number,
) {
  const steps = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    m.vx += (k * (tx - m.x) - c * m.vx) * h;
    m.vy += (k * (ty - m.y) - c * m.vy) * h;
    m.x += m.vx * h;
    m.y += m.vy * h;
  }
}

// Wagi barw światła w zależności od pozycji (suma = 1, więc jasność jest stała)
function lightWeights(nx: number, ny: number, out: number[]) {
  let sum = 0;
  LIGHT.forEach((anchor, i) => {
    const dx = nx - anchor.x;
    const dy = (ny - anchor.y) * 0.8;
    out[i] = Math.exp(-(dx * dx + dy * dy) / 0.157);
    sum += out[i];
  });
  for (let i = 0; i < out.length; i++) out[i] /= sum || 1;
}

type Mote = {
  x: number;
  y: number;
  z: number; // 0.2-1, 1 = najbliżej
  size: number;
  phase: number;
  rate: number;
  dx: number;
  dy: number;
};

const makeDust = (count: number): Mote[] =>
  Array.from({ length: count }, () => {
    const z = 0.2 + Math.random() * 0.8;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random(),
      y: Math.random(),
      z,
      size: 0.5 + z * 1.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      rate: 0.4 + Math.random() * 0.9,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
    };
  });

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// stała sekwencja pozycji ziarna (tempo taśmy filmowej, bez losowego migotania)
const GRAIN_STEPS: [number, number][] = [
  [0, 0],
  [-61, 37],
  [43, -72],
  [-24, -49],
  [70, 18],
  [-80, -12],
  [12, 66],
  [-47, 74],
  [58, -31],
  [-7, -85],
];

export function Ambient() {
  const root = useRef<HTMLDivElement>(null);
  const tightRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const tightEl = tightRef.current;
    const coreEl = coreRef.current;
    const haloEl = haloRef.current;
    const grainEl = grainRef.current;
    if (!rootEl || !tightEl || !coreEl || !haloEl || !grainEl) return;

    const dustCanvas = dustRef.current;
    const dustCtx = dustCanvas?.getContext("2d") ?? null;

    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;
    let lite = LITE;
    let alive = !calm && !lite; // dryf i paralaksa
    let dustOn = alive && DUST.count > 0 && dustCtx !== null;

    const blobEls = Array.from(
      rootEl.querySelectorAll<HTMLElement>("[data-blob]"),
    );
    const blendEls = Array.from(
      rootEl.querySelectorAll<HTMLElement>("[data-blend]"),
    );
    const pulses = Array.from(
      rootEl.querySelectorAll<HTMLElement>("[data-pulse]"),
    );
    const stageEl = rootEl.querySelector<HTMLElement>("[data-stage]");
    // światło wychodzi z kropki kursora (jeśli istnieje), a nie z surowej pozycji myszy
    const dotEl = document.querySelector<HTMLElement>("[data-cursor-dot]");
    const layers = [
      Array.from(tightEl.children) as HTMLElement[],
      Array.from(coreEl.children) as HTMLElement[],
      Array.from(haloEl.children) as HTMLElement[],
    ];

    const view = { w: window.innerWidth, h: window.innerHeight };
    const wander = (t: number) => ({
      x: view.w * (0.5 + 0.3 * Math.sin(t * 0.21)),
      y: view.h * (0.46 + 0.22 * Math.cos(t * 0.16 + 1)),
    });

    const start = wander(0);
    const pointer = { x: start.x, y: start.y };
    const tight = makeMass(start.x, start.y);
    const core = makeMass(start.x, start.y);
    const halo = makeMass(start.x, start.y);
    const par = { x: 0, y: 0 };
    const scroll = { p: 0, target: 0, v: 0, ready: false };
    const intro = { v: 0 };
    const weights = LIGHT.map(() => 0);
    const shown = LIGHT.map(() => -1);
    const motes = dustOn ? makeDust(DUST.count) : [];

    let lastMove = -Infinity;
    let hasPointer = false;
    let follow = 0; // 0 = światło wędruje samo, 1 = podąża za kursorem
    let energy = 0; // 0-1: jak szybko poruszasz myszą
    let vel = 0; // 0-1: jak szybko przewijasz stronę
    let time = 0;
    let grainClock = 0;
    let grainIndex = 0;
    let pulseIndex = 0;
    let frames = 0;
    let frameSum = 0;

    const sizeDust = () => {
      if (!dustCanvas || !dustCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      dustCanvas.width = Math.round(view.w * dpr);
      dustCanvas.height = Math.round(view.h * dpr);
      dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeDust();

    // gdy komputer nie wyrabia, wyłączamy najdroższe efekty zamiast dopuścić do zacinania
    const degrade = () => {
      if (lite) return;
      lite = true;
      alive = false;
      dustOn = false;
      blendEls.forEach((el) => {
        el.style.mixBlendMode = "normal";
      });
      dustCtx?.clearRect(0, 0, view.w, view.h);
    };

    const place = (
      el: HTMLElement,
      m: Mass,
      scale: number,
      opacity: number,
    ) => {
      el.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(3);
    };

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      time += dt;

      // monitor płynności: pomijamy start, mierzymy ok. 100 klatek
      if (!lite && frames < 150) {
        frames += 1;
        if (frames > 45 && deltaMs < 100) frameSum += deltaMs;
        if (frames === 150 && frameSum / 105 > 24) degrade();
      }

      // 1. postęp scrolla (wygładzony) i energia przewijania
      scroll.p +=
        (scroll.target - scroll.p) * (1 - Math.exp(-dt * TUNING.scrollLag));
      scroll.v *= Math.exp(-dt * 5);
      vel +=
        (clamp01(Math.abs(scroll.v) / 2500) - vel) * (1 - Math.exp(-dt * 4));

      // 2. cel światła: kropka kursora albo spokojna wędrówka, z płynnym przejściem
      let px = pointer.x;
      let py = pointer.y;
      if (dotEl && hasPointer) {
        const dx = Number(gsap.getProperty(dotEl, "x"));
        const dy = Number(gsap.getProperty(dotEl, "y"));
        if (Number.isFinite(dx) && Number.isFinite(dy)) {
          px = dx;
          py = dy;
        }
      }
      const idle = performance.now() - lastMove > TUNING.idleMs;
      const wantsPointer = hasPointer && !idle && !coarse;
      follow +=
        ((wantsPointer ? 1 : 0) - follow) *
        (1 - Math.exp(-dt * (wantsPointer ? 6 : 1.4)));
      const eased = follow * follow * (3 - 2 * follow);
      const w = wander(time);
      const tx = calm ? (hasPointer ? px : view.w * 0.3) : lerp(w.x, px, eased);
      const ty = calm
        ? hasPointer
          ? py
          : view.h * 0.35
        : lerp(w.y, py, eased);

      // 3. sprężyny o różnej bezwładności
      if (calm) {
        for (const m of [tight, core, halo]) {
          m.x = tx;
          m.y = ty;
          m.vx = 0;
          m.vy = 0;
        }
      } else {
        spring(tight, tx, ty, TUNING.tight.k, TUNING.tight.c, dt);
        spring(core, tx, ty, TUNING.core.k, TUNING.core.c, dt);
        spring(halo, tx, ty, TUNING.halo.k, TUNING.halo.c, dt);
      }

      // 4. energia ruchu (szybki ruch myszą lub scroll lekko powiększają i rozjaśniają światło)
      const speed = Math.hypot(core.vx, core.vy);
      energy += (clamp01(speed / 1800) - energy) * (1 - Math.exp(-dt * 5));
      const lift = Math.max(energy, vel * 0.6);
      const reveal = intro.v;
      const grow = 0.7 + 0.3 * reveal;
      place(
        tightEl,
        tight,
        grow * (1 + 0.1 * lift),
        reveal * (0.8 + 0.4 * lift),
      );
      place(
        coreEl,
        core,
        grow * (1 + 0.14 * lift),
        reveal * (0.85 + 0.25 * lift),
      );
      place(
        haloEl,
        halo,
        grow * (1 + 0.05 * lift),
        reveal * (0.92 + 0.12 * lift),
      );

      // 5. barwa światła zależy od pozycji i bardzo wolno dryfuje w czasie
      const nx = clamp01(core.x / view.w + 0.12 * Math.sin(time * 0.11));
      const ny = clamp01(core.y / view.h + 0.08 * Math.cos(time * 0.09));
      lightWeights(nx, ny, weights);
      weights.forEach((weight, i) => {
        const rounded = Math.round(weight * 250) / 250;
        if (rounded === shown[i]) return;
        shown[i] = rounded;
        const visibility = rounded < 0.02 ? "hidden" : "visible"; // ukryte warstwy nie wchodzą do kompozycji
        for (const group of layers) {
          group[i].style.opacity = rounded.toFixed(3);
          group[i].style.visibility = visibility;
        }
      });

      // 6. plamy: trasa ze scrollem + organiczny dryf + paralaksa od światła
      if (alive) {
        const k = 1 - Math.exp(-2 * dt);
        par.x += ((core.x / view.w - 0.5) * 2 - par.x) * k;
        par.y += ((core.y / view.h - 0.5) * 2 - par.y) * k;
      }
      BLOBS.forEach((b, i) => {
        const phase = i * 2.399; // kąt złoty: plamy nie poruszają się zgodnie
        const omega = (Math.PI * 2) / b.period;
        let dx = 0;
        let dy = 0;
        let breathing = 1;
        let flicker = 1;
        let ox = 0;
        let oy = 0;
        if (alive) {
          dx =
            ((Math.sin(omega * time + phase) +
              0.45 * Math.sin(omega * 1.618 * time + phase * 1.3)) *
              b.sway[0] *
              view.w) /
            100;
          dy =
            ((Math.cos(omega * 0.83 * time + phase * 0.7) +
              0.45 * Math.sin(omega * 1.272 * time + phase)) *
              b.sway[1] *
              view.h) /
            100;
          breathing =
            1 +
            b.breathe *
              (0.5 + 0.5 * Math.sin(omega * 0.7 * time + phase * 0.8));
          flicker = 0.93 + 0.07 * Math.sin(omega * 1.9 * time + phase);
          ox = -par.x * b.depth * TUNING.parallax;
          oy = -par.y * b.depth * TUNING.parallax;
        }
        const x = (sample(b.x, scroll.p) / 100) * view.w + dx + ox;
        const y = (sample(b.y, scroll.p) / 100) * view.h + dy + oy;
        const stretch = breathing * (1 + 0.1 * vel);
        const el = blobEls[i];
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${breathing.toFixed(4)}, ${stretch.toFixed(4)})`;
        el.style.opacity = clamp01(
          sample(b.o, scroll.p) * flicker * (1 + 0.12 * vel),
        ).toFixed(3);
      });
      if (stageEl) {
        stageEl.style.opacity = alive
          ? (0.85 + 0.15 * Math.sin(time * 0.35)).toFixed(3)
          : "1";
      }

      // 7. pył rozświetlany przez światło
      if (dustOn && dustCtx) {
        dustCtx.clearRect(0, 0, view.w, view.h);
        let mr = 0;
        let mg = 0;
        let mb = 0;
        weights.forEach((weight, i) => {
          mr += LIGHT_RGB[i][0] * weight;
          mg += LIGHT_RGB[i][1] * weight;
          mb += LIGHT_RGB[i][2] * weight;
        });
        const cr = Math.round(lerp(235, mr, 0.45));
        const cg = Math.round(lerp(235, mg, 0.45));
        const cb = Math.round(lerp(238, mb, 0.45));

        for (const m of motes) {
          const drift = DUST.speed * m.z * time;
          let x = m.x * view.w + m.dx * drift - par.x * m.z * 38;
          let y =
            m.y * view.h +
            m.dy * drift -
            scroll.p * view.h * 2.4 * m.z -
            par.y * m.z * 38;
          x = ((x % view.w) + view.w) % view.w;
          y = ((y % view.h) + view.h) % view.h;

          const d = Math.hypot(x - core.x, y - core.y);
          const lit = Math.exp(-((d / DUST.lightRadius) ** 2) * 1.6);
          const twinkle = 0.65 + 0.35 * Math.sin(time * m.rate + m.phase);
          const a = clamp01(
            (DUST.idle * (0.4 + 0.6 * m.z) + DUST.lit * lit) * twinkle * reveal,
          );
          if (a < 0.012) continue;

          dustCtx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a.toFixed(3)})`;
          dustCtx.beginPath();
          dustCtx.arc(x, y, m.size, 0, Math.PI * 2);
          dustCtx.fill();
          if (m.z > 0.7 && lit > 0.15) {
            // większe drobinki w świetle dostają miękką poświatę
            dustCtx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${(a * 0.16).toFixed(3)})`;
            dustCtx.beginPath();
            dustCtx.arc(x, y, m.size * 3.2, 0, Math.PI * 2);
            dustCtx.fill();
          }
        }
      }

      // 8. ziarno filmowe: stała sekwencja w tempie ok. 11 klatek na sekundę
      if (!calm) {
        grainClock += dt;
        if (grainClock > 0.09) {
          grainClock = 0;
          grainIndex = (grainIndex + 3) % GRAIN_STEPS.length;
          const [gx, gy] = GRAIN_STEPS[grainIndex];
          grainEl.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
        }
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      lastMove = performance.now();
      hasPointer = true;
    };
    const onLeave = () => {
      lastMove = -Infinity;
    };
    const onResize = () => {
      view.w = window.innerWidth;
      view.h = window.innerHeight;
      sizeDust();
    };
    // fala światła przy kliknięciu, w kolorze aktualnego światła
    const onDown = (event: PointerEvent) => {
      if (calm || pulses.length === 0) return;
      const el = pulses[pulseIndex++ % pulses.length];
      const dominant = weights.indexOf(Math.max(...weights));
      el.style.background = glow(LIGHT[dominant].rgb, 0.5);
      gsap.fromTo(
        el,
        { x: event.clientX, y: event.clientY, scale: 0.12, opacity: 0.8 },
        {
          scale: 1,
          opacity: 0,
          duration: 1.4,
          ease: "power3.out",
          overwrite: true,
        },
      );
    };

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "max",
      onUpdate: (self) => {
        scroll.target = self.progress;
        scroll.v = self.getVelocity();
      },
      onRefresh: (self) => {
        scroll.target = self.progress;
        if (!scroll.ready) {
          scroll.ready = true;
          scroll.p = scroll.target; // bez "przelotu" przy wczytaniu w środku strony
        }
      },
    });

    // pierwsza klatka jest ustawiona zanim cokolwiek zobaczysz, potem tło wyłania się płynnie
    tick(0, 16);
    const fade = gsap.fromTo(
      rootEl,
      { opacity: 0 },
      { opacity: 1, duration: 1.6, ease: "power2.out" },
    );
    const introTween = gsap.to(intro, {
      v: 1,
      duration: 2.4,
      delay: 0.3,
      ease: "power2.out",
    });

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    document.documentElement.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      trigger.kill();
      fade.kill();
      introTween.kill();
    };
  }, []);

  const blend = LITE ? "" : "mix-blend-screen";

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: BASE, opacity: 0 }}
    >
      {/* baza: ciemny gradient, żeby czerń nie była płaska */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% -10%, #0c0c18 0%, ${BASE} 55%, #030307 100%)`,
        }}
      />

      {/* poświata sceniczna u góry (lekko oddycha) */}
      <div
        data-stage
        data-blend
        className={`absolute left-1/2 top-0 h-[70vh] w-[110vw] -translate-x-1/2 -translate-y-1/2 ${blend}`}
        style={{ background: glow(COLORS.violet, 0.2) }}
      />

      {/* plamy światła: wewnętrzny rdzeń daje wrażenie bryły światła */}
      {BLOBS.map((b) => (
        <div
          key={b.rgb}
          data-blob
          data-blend
          className={`absolute left-0 top-0 will-change-transform ${blend}`}
          style={{
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            opacity: 0,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: glow(b.rgb, b.alpha) }}
          />
          <div
            className="absolute inset-[28%]"
            style={{ background: glow(b.rgb, Math.min(1, b.alpha * 0.9)) }}
          />
        </div>
      ))}

      {/* pył: drobinki rozświetlane przez światło przy kursorze */}
      <canvas ref={dustRef} className="absolute inset-0 size-full" />

      {/* światło przy kursorze: szeroka poświata, rdzeń i ostry punkt */}
      <div
        ref={haloRef}
        data-blend
        className={`absolute left-0 top-0 will-change-transform ${blend}`}
        style={{
          width: TUNING.halo.size,
          height: TUNING.halo.size,
          opacity: 0,
        }}
      >
        {LIGHT.map((l) => (
          <div
            key={l.rgb}
            className="absolute inset-0"
            style={{ background: glow(l.rgb, TUNING.halo.alpha), opacity: 0 }}
          />
        ))}
      </div>
      <div
        ref={coreRef}
        data-blend
        className={`absolute left-0 top-0 will-change-transform ${blend}`}
        style={{
          width: TUNING.core.size,
          height: TUNING.core.size,
          opacity: 0,
        }}
      >
        {LIGHT.map((l) => (
          <div
            key={l.rgb}
            className="absolute inset-0"
            style={{ background: glow(l.rgb, TUNING.core.alpha), opacity: 0 }}
          />
        ))}
      </div>
      <div
        ref={tightRef}
        data-blend
        className={`absolute left-0 top-0 will-change-transform ${blend}`}
        style={{
          width: TUNING.tight.size,
          height: TUNING.tight.size,
          opacity: 0,
        }}
      >
        {LIGHT.map((l) => (
          <div
            key={l.rgb}
            className="absolute inset-0"
            style={{ background: glow(l.rgb, TUNING.tight.alpha), opacity: 0 }}
          />
        ))}
      </div>

      {/* fale światła przy kliknięciu (pula, wielokrotnego użytku) */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          data-pulse
          data-blend
          className={`absolute left-0 top-0 rounded-full ${blend}`}
          style={{
            width: PULSE,
            height: PULSE,
            marginLeft: -PULSE / 2,
            marginTop: -PULSE / 2,
            opacity: 0,
          }}
        />
      ))}

      {/* winieta */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 38%, rgb(0 0 0 / 0.55) 100%)",
        }}
      />

      {/* ziarno filmowe (overlay: nie podnosi czerni, usuwa banding gradientów) */}
      <div
        ref={grainRef}
        className="absolute -inset-24 opacity-[0.1] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
