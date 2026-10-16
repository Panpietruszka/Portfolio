import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (matchMedia("(pointer: coarse)").matches) return;
    gsap.set(dot.current, { xPercent: -50, yPercent: -50 });
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
      const clickable = target.closest("a, button, [data-cursor]");
      // data-cursor="plain": bez odwracania kolorów (np. ikony w docku)
      const plain = !!target.closest('[data-cursor="plain"]');
      if (dot.current) {
        dot.current.style.mixBlendMode = plain ? "normal" : "difference";
      }
      gsap.to(dot.current, {
        scale: plain ? 0.9 : clickable ? 4.5 : 1,
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
      className="pointer-events-none fixed top-0 left-0 z-9999 size-2.5 rounded-full bg-white opacity-0 mix-blend-difference"
    />
  );
}
