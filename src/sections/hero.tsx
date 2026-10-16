import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Reveal } from "../components/reveal";
import { LanguageSwitch } from "../components/languageSwitch";
import { Fade } from "../components/fade";
import { useSectionHold } from "../lib/useSectionHold";

export function Hero() {
  const { t } = useTranslation();
  const root = useRef<HTMLElement>(null);
  useSectionHold(root);

  return (
    <section
      ref={root}
      data-hold
      className="relative flex min-h-screen flex-col justify-between px-6 py-8 md:px-16"
    >
      <header className="relative z-10 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">Piotr</span>
        <LanguageSwitch />
      </header>

      <Fade mode="out" className="relative z-10 max-w-5xl pb-24">
        <Reveal
          as="p"
          text={t("hero.eyebrow")}
          className="mb-6 text-sm uppercase tracking-[0.3em] text-white/50"
        />
        <Reveal
          as="h1"
          text={t("hero.title")}
          className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-8xl"
        />
        <Reveal
          as="p"
          text={t("hero.subtitle")}
          className="mt-8 max-w-xl text-lg text-white/60"
        />
      </Fade>
    </section>
  );
}
