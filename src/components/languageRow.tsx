import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { getLanguageStyle } from "../lib/languageStyle";
import { LanguageIcon } from "./languageIcon";

type Props = {
  language: string;
  value: string; // sformatowany czas, np. "24 mins"
  index: number; // kolejność wiersza (opóźnienie wejścia)
};

// tekst szary na starcie, kolor wjeżdża na niego od lewej do prawej
function WipeText({ text, color }: { text: string; color: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span data-base className="text-white/45">
        {text}
      </span>
      <span
        data-wipe
        aria-hidden="true"
        className="absolute inset-0"
        style={{ color, textShadow: `0 0 14px ${color}55` }}
      >
        {text}
      </span>
    </span>
  );
}

export function LanguageRow({ language, value, index }: Props) {
  const { color, iconColor } = getLanguageStyle(language);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const delay = 0.06 + index * 0.08;
      gsap.fromTo(
        "[data-wipe]",
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.55,
          ease: "power3.out",
          delay,
          stagger: 0.07,
        },
      );
      // szary tekst pod spodem gaśnie, żeby nie prześwitywał na krawędziach liter
      gsap.to("[data-base]", {
        opacity: 0,
        duration: 0.4,
        ease: "power1.out",
        delay: delay + 0.12,
        stagger: 0.07,
      });
      gsap.fromTo(
        "[data-icon]",
        { opacity: 0, x: -5, scale: 0.7 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.45,
          ease: "back.out(2)",
          delay,
        },
      );
      gsap.fromTo(
        "[data-wash]",
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out", delay },
      );
    }, el);
    return () => ctx.revert();
  }, [index]);

  return (
    <div
      ref={root}
      className="relative -mx-1.5 flex items-center justify-between gap-3 rounded-md px-1.5 py-[3px]"
    >
      <span
        data-wash
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{
          background: `linear-gradient(90deg, ${color}1f, transparent 75%)`,
        }}
      />
      <span className="relative flex items-center gap-2">
        <span
          data-icon
          className="flex"
          style={{ filter: `drop-shadow(0 0 4px ${iconColor}66)` }}
        >
          <LanguageIcon language={language} size={13} />
        </span>
        <WipeText text={language} color={color} />
      </span>
      <span className="relative">
        <WipeText text={value} color={color} />
      </span>
    </div>
  );
}
