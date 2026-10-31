import { useEffect, useState } from "react";

type Katex = typeof import("katex").default;

// KaTeX and its stylesheet load on the first formula, so pages without math
// never fetch them. A failed load is forgotten so the next formula retries.
let katex: Promise<Katex> | null = null;
const loadKatex = () =>
  (katex ??= Promise.all([import("katex"), import("katex/dist/katex.min.css")])
    .then(([m]) => m.default)
    .catch((error: unknown) => {
      katex = null;
      throw error;
    }));

// TeX math. KaTeX escapes what it is given, and with `trust` off it refuses
// the commands that load resources or set HTML attributes, so the HTML it
// returns is safe to insert. The size and macro caps stop a formula from
// covering the page or looping. A formula KaTeX cannot read shows in red
// instead of breaking the comment.
export function Formula({ tex, display }: { tex: string; display: boolean }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    // On a failed load the formula stays as its source text.
    loadKatex()
      .then((k) => {
        if (!live) return;
        setHtml(
          k.renderToString(tex, {
            displayMode: display,
            throwOnError: false,
            trust: false,
            strict: "ignore",
            maxSize: 10,
            maxExpand: 500,
            output: "htmlAndMathml",
          }),
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [tex, display]);

  const Tag = display ? "div" : "span";
  if (html === null)
    return (
      <Tag
        className={
          display
            ? "overflow-x-auto py-1 font-mono text-[0.9em] text-muted-foreground"
            : "font-mono text-[0.9em] text-muted-foreground"
        }
      >
        {display ? tex : `$${tex}$`}
      </Tag>
    );
  return (
    <Tag
      className={display ? "overflow-x-auto overflow-y-hidden py-1" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
