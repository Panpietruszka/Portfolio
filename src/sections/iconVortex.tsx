import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { gsap, ScrollTrigger } from "../lib/gsap";
import {
  VORTEX,
  DOCK,
  ORDER,
  clamp,
  smootherstep,
  smoothstep,
} from "../lib/vortex";
import { Reveal } from "../components/reveal";
import { Dock } from "../components/dock";

const modules = import.meta.glob<string>("../assets/icons/*.{png,webp,svg}", {
  eager: true,
  import: "default",
});

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const sources: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, src]) => [
    normalize(
      path
        .split("/")
        .pop()!
        .replace(/\.\w+$/, ""),
    ),
    src,
  ]),
);

const names = [
  ...ORDER.filter((n) => n in sources),
  ...Object.keys(sources).filter((n) => !ORDER.includes(n)),
];

const dockIcons = DOCK.icons.filter((n) => names.includes(n));

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function makeTile(img: HTMLImageElement, anisotropy: number) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.imageSmoothingQuality = "high";

  const pad = 10;
  const grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "rgba(255,255,255,0.16)");
  grad.addColorStop(1, "rgba(255,255,255,0.05)");
  g.beginPath();
  g.roundRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.26);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = "rgba(255,255,255,0.2)";
  g.stroke();

  const inner = size * 0.58;
  const ratio = Math.min(inner / img.width, inner / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  return map;
}

function makeGlow() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, "rgba(170,145,255,0.9)");
  grad.addColorStop(0.4, "rgba(124,92,255,0.35)");
  grad.addColorStop(1, "rgba(124,92,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

const bezier = (a: number, c: number, b: number, u: number) =>
  (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;

export function IconVortex() {
  const { t } = useTranslation();
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const [dockImages, setDockImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const section = root.current!;
    const canvasEl = canvas.current!;
    const titleEl = title.current!;
    const dockEl = document.querySelector<HTMLElement>("[data-dock]")!;
    const slotEls = Array.from(
      dockEl.querySelectorAll<HTMLElement>("[data-slot]"),
    );
    const dockIndex = names.map((n) => dockIcons.indexOf(n));
    const dockCount = dockIcons.length;
    const maxRank = Math.max(1, dockCount - 1);

    let disposed = false;
    let visible = true;
    let target = 0;
    let cur = 0;
    let time = 0;
    let wasDocked = false;
    let lastBar = -1;
    let lastGlow = -1;
    let baseZ = VORTEX.cameraZ;
    const pointer = { x: 0, y: 0 };

    const setVar = (name: string, value: string) => {
      section.style.setProperty(name, value);
      dockEl.style.setProperty(name, value);
    };

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(VORTEX.fov, 1, 0.1, 100);
    const group = new THREE.Group();
    group.rotation.set(VORTEX.tiltX, 0, VORTEX.tiltZ);
    group.updateMatrixWorld(true);
    scene.add(group);

    const sprites: THREE.Sprite[] = [];
    const glows: (THREE.Sprite | undefined)[] = [];
    const textures: THREE.Texture[] = [];
    let glowMap: THREE.Texture | null = null;

    const resize = () => {
      const w = section.clientWidth;
      const h = section.clientHeight;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      baseZ = VORTEX.cameraZ * clamp(1.1 / aspect, 1, 2.6);
      camera.position.z = baseZ;
      camera.updateProjectionMatrix();
    };
    resize();

    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    Promise.all(names.map((n) => loadImage(sources[n]))).then((images) => {
      if (disposed) return;
      glowMap = makeGlow();
      images.forEach((img, i) => {
        const map = makeTile(img, anisotropy);
        textures.push(map);
        const material = new THREE.SpriteMaterial({
          map,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0,
        });
        const sprite = new THREE.Sprite(material);
        sprite.renderOrder = 1;
        sprite.scale.set(VORTEX.tile, VORTEX.tile, 1);
        group.add(sprite);
        sprites.push(sprite);

        if (dockIcons.includes(names[i])) {
          const glow = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: glowMap,
              transparent: true,
              depthWrite: false,
              depthTest: false,
              blending: THREE.AdditiveBlending,
              opacity: 0,
            }),
          );
          glow.renderOrder = 0;
          group.add(glow);
          glows[i] = glow;
        }
      });

      const urls: Record<string, string> = {};
      dockIcons.forEach((id) => {
        const canvasTile = textures[names.indexOf(id)]
          .image as HTMLCanvasElement;
        urls[id] = canvasTile.toDataURL("image/png");
      });
      setDockImages(urls);
    });

    const unprojected = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const slotPos = new THREE.Vector3();
    const slotInfo = (k: number): number | null => {
      const el = slotEls[k];
      if (!el) return null;
      const s = section.getBoundingClientRect();
      const d = dockEl.getBoundingClientRect();
      const cx = d.left - s.left + el.offsetLeft + el.offsetWidth / 2;
      const cy = d.top - s.top + el.offsetTop + el.offsetHeight / 2;
      unprojected
        .set((cx / s.width) * 2 - 1, -(cy / s.height) * 2 + 1, 0.5)
        .unproject(camera);
      dir.copy(unprojected).sub(camera.position).normalize();
      slotPos
        .copy(camera.position)
        .addScaledVector(dir, -camera.position.z / dir.z);
      const worldPerPx =
        (2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          camera.position.z) /
        s.height;
      return el.offsetWidth * worldPerPx;
    };

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      time += dt;

      // 1. ZASADA MAKSYMALNEGO TEMPA I NIEZALEŻNEGO DOKOŃCZENIA:
      // Wyliczamy pożądaną zmianę delta w kierunku targetu z nałożonym limitem maxSpeed.
      const diff = target - cur;
      const maxStep = (VORTEX.maxSpeed || 1.8) * dt;
      const stepDelta = clamp(
        diff * (1 - Math.exp(-VORTEX.follow * dt)),
        -maxStep,
        maxStep,
      );

      cur += stepDelta;

      // Jeśli różnica jest mikroskopijna, wyrównujemy stan
      if (Math.abs(target - cur) < 0.0001) {
        cur = target;
      }

      const p = cur;
      const dockT = clamp((p - DOCK.start) / (DOCK.end - DOCK.start), 0, 1);
      const docked = dockT >= 0.99;

      titleEl.style.opacity = String(1 - smoothstep(0.04, 0.2, p));
      titleEl.style.transform = `translateY(${-smoothstep(0, 0.2, p) * 40}px)`;

      const bar = Math.round(smoothstep(0.45, 1, dockT) * 1000) / 1000;
      if (bar !== lastBar) {
        lastBar = bar;
        setVar("--bar", String(bar));
      }
      if (docked !== wasDocked) {
        wasDocked = docked;
        dockEl.style.pointerEvents = docked ? "auto" : "none";
        setVar("--icons", docked ? "1" : "0");
      }

      // Animujemy pętlę renderowania nawet gdy visible = false (jeśli proces lądowania 'cur' jeszcze trwa)
      if ((!visible && Math.abs(target - cur) === 0) || !sprites.length) return;

      const par = 1 - smoothstep(0.1, 0.7, dockT);
      const k = 1 - Math.exp(-3 * dt);
      camera.position.x +=
        (pointer.x * VORTEX.parallax * par - camera.position.x) * k;
      camera.position.y +=
        (-pointer.y * VORTEX.parallax * 0.6 * par - camera.position.y) * k;
      camera.position.z = baseZ - DOCK.dolly * Math.sin(Math.PI * dockT);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const n = sprites.length;
      const mid = (n - 1) / 2;
      const travel = Math.max(
        0,
        ((n - 1) * VORTEX.rise) / 2 - VORTEX.travelMargin,
      );
      const ty = THREE.MathUtils.lerp(-travel, travel, p);
      const bloom = smoothstep(0, VORTEX.bloomIn, p);
      const radius =
        VORTEX.radius * (VORTEX.bloomMin + (1 - VORTEX.bloomMin) * bloom);
      const scatter = 1 + DOCK.scatter * smoothstep(0, 0.8, dockT);
      const rot = p * VORTEX.turns * Math.PI * 2 + time * VORTEX.idle;
      const halfH =
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const [backScale, frontScale] = VORTEX.depthScale;
      const fadeRest = 1 - smoothstep(0, 0.5, dockT);
      const span = 1 - DOCK.stagger * maxRank;
      let landing = 0;

      sprites.forEach((sprite, i) => {
        const a = (i * VORTEX.angleStep * Math.PI) / 180 + rot;
        const y = (mid - i) * VORTEX.rise + ty;
        const x = Math.sin(a) * radius;
        const z = Math.cos(a) * radius;

        const front = (Math.cos(a) + 1) / 2;
        const edge = 1 - smoothstep(halfH * 0.7, halfH * 1.05, Math.abs(y));
        let opacity =
          (VORTEX.backOpacity + (1 - VORTEX.backOpacity) * front ** 1.3) *
          bloom *
          edge;
        let size = VORTEX.tile * (backScale + (frontScale - backScale) * front);
        const material = sprite.material as THREE.SpriteMaterial;
        const glow = glows[i];
        let glowOpacity = 0;
        let spin = 0;

        const slot = dockIndex[i];
        if (slot < 0) {
          opacity *= fadeRest;
          sprite.position.set(x * scatter, y, z * scatter);
        } else {
          const rank = Math.abs(slot - (dockCount - 1) / 2) * 2;
          const tk = clamp((dockT - rank * DOCK.stagger) / span, 0, 1);
          const u = smootherstep(tk);
          const slotSize = tk > 0 ? slotInfo(slot) : null;
          if (slotSize !== null) {
            group.worldToLocal(slotPos);
            const side = slot % 2 === 0 ? 1 : -1;
            const cxp = (x + slotPos.x) / 2 + side * DOCK.swing;
            const cyp = (y + slotPos.y) / 2 + DOCK.lift;
            const czp = (z + slotPos.z) / 2 + DOCK.arc;
            sprite.position.set(
              bezier(x, cxp, slotPos.x, u),
              bezier(y, cyp, slotPos.y, u),
              bezier(z, czp, slotPos.z, u),
            );
            const pop =
              1 + DOCK.pop * Math.sin(Math.PI * smoothstep(0.5, 1, u));
            size = THREE.MathUtils.lerp(size, slotSize, u) * pop;
            opacity = THREE.MathUtils.lerp(opacity, 1, u);
            spin = side * DOCK.spin * Math.sin(Math.PI * u) * (1 - u);
            glowOpacity = DOCK.glow * Math.sin(Math.PI * u) ** 1.2;
            landing = Math.max(landing, Math.exp(-(((tk - 0.95) / 0.05) ** 2)));
          } else {
            sprite.position.set(x, y, z);
          }
          if (docked) {
            opacity = 0;
            glowOpacity = 0;
          }
        }

        material.opacity = opacity;
        material.rotation = spin;
        sprite.scale.set(size, size, 1);

        if (glow) {
          glow.position.copy(sprite.position);
          glow.scale.set(size * 2.4, size * 2.4, 1);
          (glow.material as THREE.SpriteMaterial).opacity = glowOpacity;
        }
      });

      const glowVar =
        docked || dockT === 0 ? 0 : Math.round(landing * 100) / 100;
      if (glowVar !== lastGlow) {
        lastGlow = glowVar;
        setVar("--glow", String(glowVar));
      }

      renderer.render(scene, camera);
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const ctx = gsap.context(() => {
      // 2. WIEKSZY EMPTY SCROLL:
      // Powiększamy wysokość dystansu przetrzymania (np. 1.8 * VORTEX.screens),
      // dając użytkownikowi więcej fizycznej przestrzeni przewijania na zablokowanym widoku.
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${window.innerHeight * (VORTEX.screens * 1.8)}`,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          target = self.progress;
        },
        onRefresh: (self) => {
          target = self.progress;
        },
      });
    }, section);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { rootMargin: "20% 0px" },
    );
    intersection.observe(section);

    gsap.ticker.add(tick);
    window.addEventListener("pointermove", onMove);

    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      resizeObserver.disconnect();
      intersection.disconnect();
      ctx.revert();
      sprites.forEach((s) => (s.material as THREE.SpriteMaterial).dispose());
      glows.forEach((g) =>
        (g?.material as THREE.SpriteMaterial | undefined)?.dispose(),
      );
      textures.forEach((tx) => tx.dispose());
      glowMap?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section ref={root} className="relative h-screen overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 size-full" />

      <div
        ref={title}
        className="pointer-events-none absolute inset-x-0 top-[36%] z-10 px-6 text-center"
      >
        <Reveal
          as="p"
          text={t("vortex.eyebrow")}
          className="mb-5 text-sm uppercase tracking-[0.3em] text-white/50"
        />
        <Reveal
          as="h2"
          text={t("vortex.title")}
          className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl"
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-[14%] z-10 px-6 text-center"
        style={{ opacity: "var(--bar, 0)" }}
      >
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-white/50">
          {t("dock.eyebrow")}
        </p>
        <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          {t("dock.title")}
        </h2>
      </div>

      {createPortal(
        <Dock icons={dockIcons} images={dockImages} />,
        document.body,
      )}
    </section>
  );
}
