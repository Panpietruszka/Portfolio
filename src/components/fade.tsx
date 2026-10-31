import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";

type Props = {
  children: ReactNode;
  className?: string;
  mode?: "inOut" | "in" | "out";
  distance?: number;
  cursor?: boolean;
};

// Płynne pojawianie i znikanie sterowane scrollem. Działa w obie strony:
// przewijanie w górę odwraca animację dokładnie tak samo płynnie.
// Gdy element jest prawie niewidoczny, nie reaguje na kursor (pointer-events: none),
// żeby ukryta sekcja nie przechwytywała hovera spod innej sekcji.
export function Fade({
  children,
  className,
  mode = "inOut",
  distance = 48,
  cursor,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      // sekcje z zatrzymaniem (data-hold) są przypięte, więc wyjście
      // musi zacząć się dopiero po zakończeniu przypięcia
      const pinned = el.closest<HTMLElement>("[data-hold]") ?? undefined;

      // przed wejściem i po wyjściu element jest niewidoczny, więc wyłączamy mu kursor
      let hiddenIn = mode !== "out";
      let hiddenOut = false;
      const sync = () => {
        el.style.pointerEvents = hiddenIn || hiddenOut ? "none" : "";
      };
      const checkIn = (progress: number) => {
        const hidden = progress < 0.5;
        if (hidden !== hiddenIn) {
          hiddenIn = hidden;
          sync();
        }
      };
      const checkOut = (progress: number) => {
        const hidden = progress > 0.5;
        if (hidden !== hiddenOut) {
          hiddenOut = hidden;
          sync();
        }
      };
      sync();

      if (mode !== "out") {
        gsap.fromTo(
          el,
          { opacity: 0, y: distance },
          {
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 96%",
              end: "top 66%",
              scrub: 0.6,
              onUpdate: (self) => checkIn(self.progress),
              onRefresh: (self) => checkIn(self.progress),
            },
          },
        );
      }
      if (mode !== "in") {
        gsap.fromTo(
          el,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -distance * 0.6,
            ease: "none",
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              pinnedContainer: pinned,
              start: "bottom 40%",
              end: "bottom 5%",
              scrub: 0.6,
              onUpdate: (self) => checkOut(self.progress),
              onRefresh: (self) => checkOut(self.progress),
            },
          },
        );
      }

      return () => {
        el.style.pointerEvents = "";
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} data-cursor={cursor ? "" : undefined}>
      {children}
    </div>
  );
}
