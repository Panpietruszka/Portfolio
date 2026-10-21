import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "./gsap";
import { MOTION } from "./motion";

// Przypina sekcję w sposób płynny i subtelny, zapobiegając agresywnemu blokowaniu scrolla.
export function useSectionHold(
  ref: RefObject<HTMLElement | null>,
  screens = MOTION.holdScreens,
) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      // Zmniejszamy siłę przytrzymania do płynnego, nieinwazyjnego dystansu (np. 35-45% ekranu)
      const holdDistance = window.innerHeight * Math.min(screens, 0.45);

      ScrollTrigger.create({
        trigger: el,
        start: () =>
          el.offsetHeight > window.innerHeight
            ? "bottom bottom"
            : "center center",
        end: () => `+=${holdDistance}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 10,
      });
    },
    { scope: ref },
  );
}
