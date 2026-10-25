import { useId } from "react";
import { getLanguageStyle } from "../lib/languageStyle";

type Props = {
  language: string;
  size?: number;
  className?: string;
};

export function LanguageIcon({ language, size = 14, className }: Props) {
  const { iconColor, duo, icon } = getLanguageStyle(language);
  const gradientId = `duo-${useId().replace(/:/g, "")}`;

  if (icon.kind === "badge") {
    // znaczek z literą dla języków, których marki nie ma w simple-icons
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          width: size,
          height: size,
          color: iconColor,
          border: `1.5px solid ${iconColor}`,
          borderRadius: size * 0.25,
          fontSize: size * (icon.label.length > 1 ? 0.5 : 0.62),
          lineHeight: 1,
          fontWeight: 700,
          fontFamily: "ui-monospace, monospace",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon.label}
      </span>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={duo ? `url(#${gradientId})` : iconColor}
      className={className}
      style={{ flexShrink: 0 }}
    >
      {duo && (
        <defs>
          {/* twardy podział po przekątnej: dwie połówki logo w dwóch kolorach */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.5" stopColor={duo[0]} />
            <stop offset="0.5" stopColor={duo[1]} />
          </linearGradient>
        </defs>
      )}
      <path d={icon.path} />
    </svg>
  );
}
