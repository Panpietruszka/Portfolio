import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWordReveal } from "../lib/useWordReveal";

type Props = {
  as?: "h1" | "h2" | "p";
  text: string;
  className?: string;
};

function RevealInner({ as: Component = "p", text, className }: Props) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);

  useWordReveal(ref);

  return (
    <Component ref={ref} className={className}>
      {text}
    </Component>
  );
}

// key z aktualnym językiem montuje element od nowa po zmianie języka,
// dzięki czemu SplitText nie walczy z podmienionym tekstem
export function Reveal(props: Props) {
  const { i18n } = useTranslation();
  return <RevealInner key={i18n.language} {...props} />;
}
