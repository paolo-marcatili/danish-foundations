import { useLayoutEffect, useRef, useState } from "react";

interface FitTextProps {
  text: string;
  className?: string;
  lang?: string;
  maxRem?: number;
  minRem?: number;
  singleLine?: boolean;
}

export function FitText({ text, className, lang, maxRem = 1, minRem = 0.65, singleLine = false }: FitTextProps) {
  const outerRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const [fontSize, setFontSize] = useState(maxRem);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const fit = () => {
      let next = maxRem;
      inner.style.fontSize = `${next}rem`;
      inner.style.whiteSpace = singleLine ? "nowrap" : "normal";

      const maxAttempts = 80;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const tooWide = inner.scrollWidth > outer.clientWidth + 1;
        const tooTall = inner.scrollHeight > outer.clientHeight + 1;
        if ((!tooWide && !tooTall) || next <= minRem) break;
        next = Math.max(minRem, next * 0.92);
        inner.style.fontSize = `${next}rem`;
      }

      setFontSize(next);
    };

    fit();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    observer?.observe(outer);
    window.addEventListener("orientationchange", fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener("orientationchange", fit);
    };
  }, [text, maxRem, minRem, singleLine]);

  return (
    <span ref={outerRef} className={`fit-text ${className ?? ""}`} lang={lang}>
      <span ref={innerRef} className="fit-text-inner" style={{ fontSize: `${fontSize}rem` }}>
        {text}
      </span>
    </span>
  );
}
