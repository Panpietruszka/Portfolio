import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "../lib/gsap";

type Props = {
  value: number;
  format: (value: number) => string;
  className?: string;
};

// Liczba, która doliczana jest płynnie po wejściu w widok (i wraca do 0 po wyjściu
// poza dolną krawędź), oraz płynnie zmienia się przy każdej aktualizacji danych.
export function CountUp({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: 0 });
  const formatRef = useRef(format);
  const [inView, setInView] = useState(false);

  // aktualny format (np. po zmianie języka) bez restartu animacji
  useLayoutEffect(() => {
    formatRef.current = format;
    if (ref.current)
      ref.current.textContent = format(Math.round(shown.current.v));
  });

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        onEnter: () => setInView(true),
        onLeave: () => setInView(true),
        onEnterBack: () => setInView(true),
      });
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        onLeaveBack: () => setInView(false),
      });
    },
    { scope: ref },
  );

  useEffect(() => {
    const target = inView ? value : 0;
    const delta = Math.abs(target - shown.current.v);
    const tween = gsap.to(shown.current, {
      v: target,
      duration: inView ? Math.min(1.2, 0.35 + delta / 400) : 0.01,
      ease: "power3.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = formatRef.current(
            Math.round(shown.current.v),
          );
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, inView]);

  return <span ref={ref} className={className} />;
}
