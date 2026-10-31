import skycastImage from "../assets/projects/skycast.png";
import portfolioImage from "../assets/projects/portfolio.jpg";

export type Project = {
  id: string; // klucz tłumaczeń: projects.items.<id>.summary
  name: string;
  image: string; // zaimportowany plik z src/assets/projects/
  stack: string[];
};

// Kolejny projekt: zaimportuj zrzut u góry, dopisz obiekt i klucz projects.items.<id>.summary
// w pl.json oraz en.json. Cztery projekty dają pełny układ bento, każde następne cztery
// powtarzają go niżej.
export const PROJECTS: Project[] = [
  {
    id: "skycast",
    name: "SkyCast",
    image: skycastImage,
    stack: ["JavaScript", "Firebase", "GSAP", "Open-Meteo"],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    image: portfolioImage,
    stack: ["React", "TypeScript", "GSAP", "FastAPI", "Turso"],
  },
];
