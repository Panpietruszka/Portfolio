import {
  siC,
  siCplusplus,
  siCss,
  siGnubash,
  siGo,
  siHtml5,
  siJavascript,
  siJson,
  siKotlin,
  siMarkdown,
  siPython,
  siRust,
  siTypescript,
  siYaml,
} from "simple-icons";

// logo: ścieżka SVG (viewBox 0 0 24 24) albo znaczek z literą, gdy marki nie ma w simple-icons
export type LanguageIconSource =
  | { kind: "path"; path: string }
  | { kind: "badge"; label: string };

export type LanguageStyle = {
  color: string; // odcień tekstu (nazwa i minuty)
  iconColor: string; // kolor logo, jak najbliższy oryginałowi
  duo?: [string, string]; // logo dwukolorowe: [lewa-górna połowa, prawa-dolna połowa]
  icon: LanguageIconSource;
};

const path = (d: string): LanguageIconSource => ({ kind: "path", path: d });
const badge = (label: string): LanguageIconSource => ({ kind: "badge", label });

// własne glify (viewBox 24)
const CODE_GLYPH =
  "M8.6 7.4 4 12l4.6 4.6 1.4-1.4L6.8 12 10 8.8 8.6 7.4zm6.8 0-1.4 1.4 3.2 3.2-3.2 3.2 1.4 1.4L20 12l-4.6-4.6z";
const DATABASE_GLYPH =
  "M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.59 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm6 14c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-4.55c-1.3.95-3.58 1.55-6 1.55s-4.7-.6-6-1.55V9.64c1.47.83 3.61 1.36 6 1.36s4.53-.53 6-1.36v2.81zM12 9C8.13 9 6 7.5 6 7s2.13-2 6-2 6 1.5 6 2-2.13 2-6 2z";

// klucze = nazwy z api/_lib/languages.py
export const LANGUAGE_STYLE: Record<string, LanguageStyle> = {
  HTML: { color: "#FF8F5E", iconColor: "#E34F26", icon: path(siHtml5.path) },
  CSS: { color: "#B9A0FF", iconColor: "#9B6BDB", icon: path(siCss.path) },
  JavaScript: {
    color: "#F2DC5D",
    iconColor: "#F7DF1E",
    icon: path(siJavascript.path),
  },
  TypeScript: {
    color: "#62AEFF",
    iconColor: "#3178C6",
    icon: path(siTypescript.path),
  },
  Python: {
    color: "#FFD95A",
    iconColor: "#FFD43B",
    duo: ["#4B8BBE", "#FFD43B"],
    icon: path(siPython.path),
  },
  YAML: { color: "#FF7A7A", iconColor: "#E0373D", icon: path(siYaml.path) },
  JSON: { color: "#DCD36C", iconColor: "#E6E6E6", icon: path(siJson.path) },
  Markdown: {
    color: "#AEB8C6",
    iconColor: "#D9D9D9",
    icon: path(siMarkdown.path),
  },
  SQL: { color: "#5FC0E8", iconColor: "#4DA6D6", icon: path(DATABASE_GLYPH) },
  Java: { color: "#FFA64D", iconColor: "#F89820", icon: badge("J") },
  Kotlin: { color: "#A58BFF", iconColor: "#7F52FF", icon: path(siKotlin.path) },
  C: { color: "#9CB8D6", iconColor: "#A8B9CC", icon: path(siC.path) },
  "C++": {
    color: "#52A8F0",
    iconColor: "#3D8FD9",
    icon: path(siCplusplus.path),
  },
  "C#": { color: "#C08BE8", iconColor: "#A66BCB", icon: badge("C#") },
  Go: { color: "#37D0EE", iconColor: "#00ADD8", icon: path(siGo.path) },
  Rust: { color: "#F2916A", iconColor: "#F74C00", icon: path(siRust.path) },
  Shell: { color: "#72D26A", iconColor: "#4EAA25", icon: path(siGnubash.path) },
  PowerShell: { color: "#6FA3FF", iconColor: "#5391FE", icon: badge(">_") },
};

export const OTHER_STYLE: LanguageStyle = {
  color: "#9AA3B2",
  iconColor: "#8A93A3",
  icon: path(CODE_GLYPH),
};

export function getLanguageStyle(language: string): LanguageStyle {
  return LANGUAGE_STYLE[language] ?? OTHER_STYLE;
}
