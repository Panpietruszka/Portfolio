import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";

type Key = { x: string; y: string; o: number };

// Każda poświata przechodzi przez 3 punkty w trakcie całej strony
const BLOBS: { rgb: string; path: [Key, Key, Key] }[] = [
  {
    rgb: "124 92 255", // fiolet
    path: [
      { x: "-15vw", y: "-25vh", o: 0.9 },
      { x: "50vw", y: "10vh", o: 0.5 },
      { x: "-5vw", y: "55vh", o: 0.8 },
    ],
  },
  {
    rgb: "47 107 255", // błękit
    path: [
      { x: "80vw", y: "20vh", o: 0 },
      { x: "65vw", y: "30vh", o: 0.7 },
      { x: "20vw", y: "60vh", o: 0.4 },
    ],
  },
  {
    rgb: "214 66 255", // magenta
    path: [
      { x: "60vw", y: "70vh", o: 0 },
      { x: "10vw", y: "40vh", o: 0.55 },
      { x: "70vw", y: "40vh", o: 0.7 },
    ],
  },
  {
    rgb: "24 200 176", // turkus
    path: [
      { x: "-10vw", y: "80vh", o: 0 },
      { x: "80vw", y: "75vh", o: 0.35 },
      { x: "40vw", y: "20vh", o: 0.5 },
    ],
  },
];

const grain = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export function Ambient() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>("[data-blob]");
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "max",
          scrub: 1.5,
          invalidateOnRefresh: true,
        },
      });

      els.forEach((el, i) => {
        const [a, b, c] = BLOBS[i].path;
        gsap.set(el, { x: a.x, y: a.y, opacity: a.o });
        tl.to(el, { x: b.x, y: b.y, opacity: b.o, duration: 1 }, 0).to(
          el,
          { x: c.x, y: c.y, opacity: c.o, duration: 1 },
          1,
        );
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {BLOBS.map((b) => (
        <div
          key={b.rgb}
          data-blob
          className="absolute left-0 top-0 size-[75vmax] rounded-full"
          style={{
            background: `radial-gradient(closest-side, rgb(${b.rgb} / 0.5), transparent)`,
          }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: grain }}
      />
    </div>
  );
}
