import { useSyncExternalStore } from "react";
import { gsap, ScrollTrigger } from "./gsap";

const KEY = "portfolioIntroSeen";
const MAX_WAIT = 7000; // ms: po tym czasie ruszamy, nawet jeśli coś się nie doładowało

// Pełne intro: przy pierwszym wejściu w sesji, po twardym odświeżeniu albo z ?intro w adresie.
function decide(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = new URLSearchParams(location.search).has("intro");
    const seen = sessionStorage.getItem(KEY) === "1";
    sessionStorage.setItem(KEY, "1");
    return !reduce && (forced || !seen);
  } catch {
    return false;
  }
}
export const INTRO_PLAYS = decide();

// Ctrl+F5 / Ctrl+Shift+R / Cmd+Shift+R: zerujemy flagę tuż przed przeładowaniem
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const hard =
      (e.key === "F5" && (e.ctrlKey || e.shiftKey)) ||
      (key === "r" && e.shiftKey && (e.ctrlKey || e.metaKey));
    if (hard) {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* ignorujemy */
      }
    }
  });
}

// ---------- stan czytany przez ambient w każdej klatce ----------
const FINAL = {
  light: 1, // jasność warstw światła (rdzeń, halo)
  size: 1, // rozmiar światła: od iskry do pełnej plamy
  bloom: 1, // plamy wylatują ze światła na swoje miejsca
  dust: 1, // jasność pyłu poza światłem
  script: 0, // 0-1: jak mocno scenariusz przejmuje sterowanie światłem
  path: 1, // postęp światła po ścieżce
  vignette: 0, // dodatkowe zamknięcie winiety
  grain: 0, // dodatkowe ziarno
  boost: 0, // chwilowy "błysk" światła
};
const START = {
  light: 0,
  size: 0.1,
  bloom: 0,
  dust: 0,
  script: 1,
  path: 0,
  vignette: 1,
  grain: 1,
  boost: 0,
};

export const stage = { ...(INTRO_PLAYS ? START : { ...FINAL, light: 0 }) };

// Trasa światła (0-1 ekranu): zapłon pośrodku, zjazd na lewo, przejazd wzdłuż nagłówka, wyjście w prawo
export const INTRO_PATH = {
  x: [0.5, 0.22, 0.1, 0.35, 0.6, 0.72],
  y: [0.42, 0.6, 0.74, 0.76, 0.7, 0.46],
};

// ambient rejestruje tu falę światła, żeby intro mogło ją odpalić
export const hooks: {
  pulse?: (x: number, y: number, strength?: number) => void;
} = {};

// ---------- loader: zasłona z index.html + czekanie na gotowość strony ----------
const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

let readyPromise: Promise<void> | null = null;

// Czeka na: load, fonty, ułożenie layoutu i odświeżenie ScrollTriggerów (maks. MAX_WAIT)
export function waitUntilReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const loaded =
        document.readyState === "complete"
          ? Promise.resolve()
          : new Promise<void>((resolve) =>
              window.addEventListener("load", () => resolve(), { once: true }),
            );
      const fonts: Promise<unknown> =
        document.fonts?.ready ?? Promise.resolve();
      const timeout = new Promise<void>((resolve) =>
        setTimeout(resolve, MAX_WAIT),
      );
      await Promise.race([Promise.all([loaded, fonts]), timeout]);
      await frame();
      await frame();
      ScrollTrigger.refresh();
      await frame();
    })();
  }
  return readyPromise;
}

// Zdejmuje czarną zasłonę z index.html (duration 0 = od razu)
export function liftBoot(duration: number) {
  const el = document.getElementById("boot");
  if (!el) return;
  if (duration <= 0.02) {
    el.remove();
    return;
  }
  gsap.to(el, {
    opacity: 0,
    duration,
    ease: "power2.out",
    overwrite: true,
    onComplete: () => el.remove(),
  });
}

// ---------- bramki: kiedy hero ma pokazać tekst, nawigację i odblokować scroll ----------
type Gate = "text" | "chrome" | "done";
const open: Record<Gate, boolean> = {
  text: false,
  chrome: false,
  done: false,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const openGate = (gate: Gate) => {
  if (open[gate]) return;
  open[gate] = true;
  emit();
};

export function useIntroGate(gate: Gate): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open[gate],
    () => true,
  );
}

export function onOpen(gate: Gate, cb: () => void): () => void {
  if (open[gate]) {
    cb();
    return () => {};
  }
  const listener = () => {
    if (open[gate]) {
      cb();
      listeners.delete(listener);
    }
  };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------- zwykłe wejście (bez pełnego intro): światło rozwija się po zdjęciu zasłony ----------
export function playQuick(): () => void {
  openGate("text");
  openGate("chrome");
  openGate("done");
  const tween = gsap.to(stage, {
    light: 1,
    duration: 2.2,
    delay: 0.2,
    ease: "power2.out",
  });
  return () => {
    tween.kill();
  };
}

// ---------- scenariusz pełnego intro (ok. 4,5 s) ----------
const T = {
  ignite: 0.5, // zapłon iskry
  pulse: 0.95, // fala przy zapłonie
  sweep: 1.1, // start przejazdu światła
  sweepLen: 2.6,
  text: 2.1, // odsłonięcie tekstu hero (światło dojeżdża na lewo)
  bloom: 1.7, // plamy wylatują ze światła
  vignette: 2.4, // otwarcie winiety
  chrome: 3.2, // nawigacja
  handoff: 3.4, // światło wraca do wędrowania / kursora
  done: 4.3,
};

export function playIntro(): () => void {
  if (!INTRO_PLAYS) return () => {};

  Object.assign(stage, START);
  open.text = open.chrome = open.done = false;
  emit();

  const w = () => window.innerWidth;
  const h = () => window.innerHeight;

  const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
  const finish = () => {
    Object.assign(stage, FINAL);
    openGate("text");
    openGate("chrome");
    openGate("done");
    events.forEach((e) => window.removeEventListener(e, skip));
  };

  const tl = gsap.timeline({ onComplete: finish });
  // dowolna interakcja przyspiesza intro (płynnie, bez skoku)
  function skip() {
    tl.timeScale(5);
  }

  tl
    // zapłon: iskra rośnie, rdzeń i halo doganiają ją (różny wykładnik rozmiaru)
    .to(stage, { light: 1, duration: 0.9, ease: "power2.out" }, T.ignite)
    .to(stage, { size: 1, duration: 1.9, ease: "expo.out" }, T.ignite)
    .call(() => hooks.pulse?.(w() * 0.5, h() * 0.42, 0.55), [], T.pulse)
    .to(stage, { boost: 1, duration: 0.4, ease: "power2.out" }, T.pulse)
    .to(stage, { boost: 0, duration: 1.3, ease: "power2.inOut" }, T.pulse + 0.4)
    // światło przejeżdża po ekranie i zostawia ślad w pyle
    .to(stage, { path: 1, duration: T.sweepLen, ease: "power2.inOut" }, T.sweep)
    .to(stage, { dust: 1, duration: 1.8, ease: "power1.inOut" }, T.sweep + 0.5)
    // plamy wylatują ze światła
    .to(stage, { bloom: 1, duration: 2.2, ease: "power3.out" }, T.bloom)
    .call(() => openGate("text"), [], T.text)
    // wyciszenie: winieta i ziarno wracają do normy
    .to(stage, { vignette: 0, duration: 1.6, ease: "power2.inOut" }, T.vignette)
    .to(
      stage,
      { grain: 0, duration: 1.8, ease: "power1.out" },
      T.vignette + 0.2,
    )
    .call(() => openGate("chrome"), [], T.chrome)
    .call(() => hooks.pulse?.(w() * 0.72, h() * 0.46, 0.35), [], T.handoff)
    // przekazanie: światło płynnie wraca do wędrowania / kursora
    .to(stage, { script: 0, duration: 1.0, ease: "power2.inOut" }, T.handoff)
    .call(() => openGate("done"), [], T.done);

  events.forEach((e) => window.addEventListener(e, skip, { passive: true }));

  return () => {
    tl.kill();
    events.forEach((e) => window.removeEventListener(e, skip));
  };
}
