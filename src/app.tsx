import { useEffect } from "react";
import { Ambient } from "./components/ambient";
import { Cursor } from "./components/cursor";
import { Hero } from "./sections/hero";
import { About } from "./sections/about";
import { IconVortex } from "./sections/iconVortex";
import { CodeTime } from "./sections/codeTime";
import { useSmoothScroll } from "./lib/useSmoothScroll";
import {
  INTRO_PLAYS,
  liftBoot,
  playIntro,
  playQuick,
  waitUntilReady,
} from "./lib/intro";

export default function App() {
  useSmoothScroll();

  // loader: czekamy aż strona się ułoży, dopiero wtedy zdejmujemy zasłonę i ruszamy animację
  useEffect(() => {
    let cancelled = false;
    let stop = () => {};
    void waitUntilReady().then(() => {
      if (cancelled) return;
      // przy pełnym intro tło i tak jest czarne, więc zasłonę zdejmujemy od razu
      liftBoot(INTRO_PLAYS ? 0 : 0.9);
      stop = INTRO_PLAYS ? playIntro() : playQuick();
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <>
      <Ambient />
      <main>
        <Cursor />
        <Hero />
        <About />
        <IconVortex />
        <CodeTime />
      </main>
    </>
  );
}
  