import { cn } from "@/lib/cn";
import { parseBlocks, parseInline, toggleCheckbox } from "@/lib/markdown";
import { ImagePreviews, LinkedText } from "./linked-text";
import { Formula } from "./formula";

function Inline({ text }: { text: string }) {
  return parseInline(text).map((s, i) =>
    s.kind === "bold" ? (
      <strong key={i} className="font-semibold">
        <LinkedText text={s.text} />
      </strong>
    ) : s.kind === "code" ? (
      <code
        key={i}
        className="rounded bg-muted px-1 py-px font-mono text-[0.9em]"
      >
        {s.text}
      </code>
    ) : s.kind === "math" ? (
      <Formula key={i} tex={s.text} display={false} />
    ) : (
      <LinkedText key={i} text={s.text} />
    ),
  );
}

// A comment or description with its lists, checkboxes, bold, code, math,
// links and images. With `onToggle`, a click on a checkbox hands back the text with
// that box flipped; without it the boxes only show their state.
export function Markdown({
  text,
  onToggle,
}: {
  text: string;
  onToggle?: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 break-words">
      {parseBlocks(text).map((block, i) => {
        if (block.kind === "paragraph")
          return (
            <p key={i} className="whitespace-pre-wrap">
              <Inline text={block.text} />
            </p>
          );
        if (block.kind === "code")
          return (
            // Scrolls sideways rather than wrapping, so indentation holds.
            <pre
              key={i}
              className="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-[0.85em] leading-relaxed"
            >
              <code data-lang={block.lang || undefined}>{block.text}</code>
            </pre>
          );
        if (block.kind === "math")
          return <Formula key={i} tex={block.tex} display />;
        const List = block.ordered ? "ol" : "ul";
        return (
          <List
            key={i}
            className={cn(
              "flex flex-col gap-1 pl-5",
              block.ordered ? "list-decimal" : "list-disc",
            )}
          >
            {block.items.map((item) =>
              item.checked === null ? (
                <li key={item.line}>
                  <Inline text={item.text} />
                </li>
              ) : (
                <li
                  key={item.line}
                  className="-ml-5 flex list-none items-start gap-1"
                >
                  <label className="-m-1.5 flex shrink-0 p-1.5 [@media(pointer:coarse)]:-m-3 [@media(pointer:coarse)]:p-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={!onToggle}
                      aria-label={
                        parseInline(item.text)
                          .map((s) => s.text)
                          .join("") || "Casilla"
                      }
                      onChange={() =>
                        onToggle?.(toggleCheckbox(text, item.line))
                      }
                      className="mt-[0.2em] size-3.5 accent-primary enabled:cursor-pointer"
                    />
                  </label>
                  <span
                    className={cn(
                      item.checked &&
                        "text-muted-foreground line-through decoration-muted-foreground/50",
                    )}
                  >
                    <Inline text={item.text} />
                  </span>
                </li>
              ),
            )}
          </List>
        );
      })}
      <ImagePreviews text={text} />
    </div>
  );
}
