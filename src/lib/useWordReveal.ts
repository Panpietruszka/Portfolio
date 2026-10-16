import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, SplitText } from "./gsap";
import { MOTION } from "./motion";

export function useWordReveal(ref: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      SplitText.create(el, {
        type: "words",
        autoSplit: true,
        onSplit(self) {
          const tween = gsap.from(self.words, {
            yPercent: 40,
            opacity: 0,
            duration: 0.9,
            ease: "back.out(1.3)", // delikatny, szybki "jump"
            stagger: 0.04,
            paused: true,
          });

          ScrollTrigger.create({
            trigger: el,
            start: MOTION.revealStart,
            onEnter: () => tween.play(),
          });
          ScrollTrigger.create({
            trigger: el,
            start: MOTION.resetStart,
            onLeaveBack: () => tween.pause(0), // wraca do stanu początkowego
          });

          return tween;
        },
      });
    },
    { scope: ref },
  );
}
