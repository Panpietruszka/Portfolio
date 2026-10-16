import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";

export function useSmoothScroll() {
  useEffect(() => {
    // mniejszy lerp = płynniej i z większym opóźnieniem
    const lenis = new Lenis({ lerp: 0.065, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}
