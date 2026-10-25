import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { INTRO_PLAYS, onOpen } from "./intro";

export function useSmoothScroll() {
  useEffect(() => {
    // mniejszy lerp = płynniej i z większym opóźnieniem
    const lenis = new Lenis({ lerp: 0.065, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);

    // na czas intro scroll jest zablokowany, strona startuje od góry
    if (INTRO_PLAYS) {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      lenis.stop();
    }
    const offIntro = onOpen("done", () => lenis.start());

    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      offIntro();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}
