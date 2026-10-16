import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "./gsap";
import { MOTION } from "./motion";

// Przypina sekcję na chwilę, gdy jest w pełni odsłonięta, żeby dało się ją
// spokojnie przeczytać. Sekcja musi mieć atrybut data-hold.
export function useSectionHold(
  ref: RefObject<HTMLElement | null>,
  screens = MOTION.holdScreens,
) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      ScrollTrigger.create({
        trigger: el,
        // niższa od ekranu zatrzymuje się na środku, wyższa, gdy widać jej dół
        start: () =>
          el.offsetHeight > window.innerHeight
            ? "bottom bottom"
            : "center center",
        end: () => `+=${window.innerHeight * screens}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 10, // pin liczony przed triggerami, które od niego zależą
      });
    },
    { scope: ref },
  );
}
