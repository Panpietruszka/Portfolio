import { useTranslation } from "react-i18next";

export function LanguageSwitch() {
  const { i18n } = useTranslation();
  return (
    <div className="glass flex rounded-full p-1 text-sm">
      {["pl", "en"].map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded-full px-3 py-1 uppercase transition-colors ${
            i18n.resolvedLanguage === lng
              ? "bg-white/15"
              : "text-white/50 hover:text-white"
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
