import { Ambient } from "./components/ambient";
import { Cursor } from "./components/cursor";
import { Hero } from "./sections/hero";
import { About } from "./sections/about";
import { IconVortex } from "./sections/iconVortex";
import { useSmoothScroll } from "./lib/useSmoothScroll";

export default function App() {
  useSmoothScroll();
  return (
    <>
      <Ambient />
      <main>
        <Cursor />
        <Hero />
        <About />
        <IconVortex />
      </main>
    </>
  );
}
