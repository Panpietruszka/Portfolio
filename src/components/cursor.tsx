import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";

const SOLID = "rgba(255,255,255,1)";
const SOFT = "rgba(255,255,255,0.2)"; // półprzezroczysty krąg nad klikalnymi elementami

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (matchMedia("(pointer: coarse)").matches) return;
    gsap.set(dot.current, {
      xPercent: -50,
      yPercent: -50,
      backgroundColor: SOLID,
    });
    const x = gsap.quickTo(dot.current, "x", { duration: 0.4, ease: "power3" });
    const y = gsap.quickTo(dot.current, "y", { duration: 0.4, ease: "power3" });

    let visible = false;
    const move = (e: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.set(dot.current, { x: e.clientX, y: e.clientY });
        gsap.to(dot.current, { opacity: 1, duration: 0.3 });
      }
      x(e.clientX);
      y(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = e.target as Element;
      const clickable = !!target.closest("a, button, [data-cursor]");
      // data-cursor="plain": zwykła kropka (ikony w docku, siatka aktywności)
      const plain = !!target.closest('[data-cursor="plain"]');
      gsap.to(dot.current, {
        scale: plain ? 0.9 : clickable ? 4.5 : 1,
        backgroundColor: clickable && !plain ? SOFT : SOLID,
        duration: 0.5,
        ease: "power3.out",
        overwrite: "auto",
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  });

  return (
    <div
      ref={dot}
      data-cursor-dot
      className="pointer-events-none fixed top-0 left-0 z-9999 size-2.5 rounded-full bg-white opacity-0"
    />
  );
}
