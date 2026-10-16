export const VORTEX = {
  // kamera
  fov: 38,
  cameraZ: 9.5, // bliżej = mocniejsza perspektywa
  parallax: 0.45, // jak mocno kamera podąża za myszą

  // helisa (jednostki sceny)
  tile: 1.15, // bazowy rozmiar kafelka
  depthScale: [0.85, 1.15] as [number, number], // mnożnik rozmiaru: tył, przód
  radius: 3.8, // promień helisy
  rise: 0.36, // pionowy odstęp między ikonami
  angleStep: 51.43, // kąt między kolejnymi ikonami (stopnie), ujemny = odwrotny kierunek
  tiltX: 0.12, // pochylenie osi do widza (radiany)
  tiltZ: 0.16, // pochylenie osi w bok (radiany)
  backOpacity: 0.28, // przezroczystość ikon na samym tyle
  travelMargin: 2.2, // im większe, tym krótszy przelot w pionie

  // ruch
  turns: 1.6, // ile pełnych obrotów w trakcie sekcji
  idle: 0.06, // powolny obrót "na luzie" (rad/s)
  bloomIn: 0.16, // część sekcji, w której wir rozkwita
  bloomMin: 0.35, // promień na starcie jako ułamek docelowego

  // scroll
  screens: 5.5, // długość przypięcia w ekranach
  maxSpeed: 0.2, // MAKSYMALNA prędkość animacji (postęp 0-1 na sekundę)
  follow: 5, // jak szybko animacja goni scroll (większe = żywiej)
};

export const DOCK = {
  // znormalizowane nazwy plików, w kolejności od lewej do prawej
  icons: [
    "vscode",
    "pycharm",
    "python",
    "github",
    "git",
    "vitejs",
    "react",
    "typescript",
  ],
  start: 0.6, // postęp sekcji, w którym zaczyna się lot do docka
  end: 0.86, // postęp, w którym ikony są już w docku
  stagger: 0.045, // opóźnienie między kolejnymi ikonami (od środka na boki)

  // lot ikon
  lift: 1.3, // wybicie łuku w górę (jednostki sceny)
  arc: 3.2, // wybicie łuku w stronę widza
  swing: 0.9, // boczne wychylenie łuku (naprzemiennie)
  spin: 0.9, // obrót ikony w locie (rad), wygasa do zera przy lądowaniu
  pop: 0.2, // "wskoczenie" rozmiaru tuż przed lądowaniem
  glow: 0.6, // jasność poświaty wokół ikony w locie
  dolly: 0.8, // jak mocno kamera najeżdża w trakcie lotu
  scatter: 0.4, // jak daleko rozpraszają się pozostałe ikony

  // dock
  size: "clamp(30px,3.3vw,42px)", // rozmiar ikony w spoczynku
  gap: "clamp(8px,1.1vw,16px)", // odstęp między ikonami
  pad: "clamp(10px,1.2vw,18px)", // wewnętrzny margines paska po bokach
  magnify: 0.45, // powiększenie pod kursorem (0.45 = 1.45x); pasek jest liczony na max 1.5x
  sigma: 52, // zasięg powiększenia (px), dopasowany do rozstawu ikon
  stiffness: 260, // sztywność sprężyny ikon
  damping: 22, // tłumienie sprężyny ikon
};

// Kolejność ikon na helisie (nazwy plików znormalizowane:
// małe litery, bez spacji, kropek i myślników, np. "Tailwind CSS.png" -> "tailwindcss").
// Ikony z docka stoją pośrodku, żeby w chwili lotu były widoczne.
// Brakujące pliki są pomijane, a nieuwzględnione trafiają na koniec.
export const ORDER = [
  "html5",
  "css3",
  "nodejs",
  "postman",
  "mongodb",
  "figma",
  "javascript",
  "sqlite",
  "express",
  "linux",
  "vscode",
  "tailwindcss",
  "pycharm",
  "gsap",
  "python",
  "npm",
  "github",
  "fastapi",
  "git",
  "postgresql",
  "vitejs",
  "prettier",
  "react",
  "redis",
  "typescript",
  "vercel",
  "nextjs",
  "threejs",
  "docker",
  "windows11",
];

export const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

// jeszcze łagodniejsze końce niż smoothstep (idealne do "maślanego" lotu)
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
