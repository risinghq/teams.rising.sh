import { Bold, Code, List, ListChecks, Sigma } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from "react";
import {
  continueList,
  type Edit,
  mathAt,
  toggleList,
  wrap,
  wrapBlock,
} from "@/lib/markdown";
import { IconButton } from "@/ui/icon-button";
import { Textarea } from "@/ui/textarea";
import { Formula } from "./formula";

// Buttons that write Markdown into a text box: bold, code, an equation, a
// bulleted list and a checklist. They act on the selection and put it back,
// so typing goes on where it was. Code and equations become blocks when the
// selection spans lines.
function FormatBar({
  target,
  value,
  onChange,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (text: string) => void;
}) {
  const apply = (edit: (start: number, end: number) => Edit) => {
    const el = target.current;
    if (!el) return;
    const next = edit(el.selectionStart, el.selectionEnd);
    onChange(next.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };
  const tools = [
    {
      label: "Negrita",
      icon: <Bold />,
      run: (s: number, e: number) => wrap(value, s, e, "**"),
    },
    {
      label: "Código",
      icon: <Code />,
      run: (s: number, e: number) => wrapBlock(value, s, e, "code"),
    },
    {
      label: "Ecuación (LaTeX)",
      icon: <Sigma />,
      run: (s: number, e: number) => wrapBlock(value, s, e, "math"),
    },
    {
      label: "Lista",
      icon: <List />,
      run: (s: number, e: number) => toggleList(value, s, e, "bullet"),
    },
    {
      label: "Lista de tareas",
      icon: <ListChecks />,
      run: (s: number, e: number) => toggleList(value, s, e, "check"),
    },
  ];
  return (
    <div
      role="toolbar"
      aria-label="Formato"
      className="flex items-center gap-0.5"
    >
      {tools.map((t) => (
        <IconButton
          key={t.label}
          label={t.label}
          size="icon-xs"
          className="text-muted-foreground"
          // Mouse down would move the focus and lose the selection first.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply(t.run)}
        >
          {t.icon}
        </IconButton>
      ))}
    </div>
  );
}

// One box around a Markdown text area and its format bar, so the buttons read
// as part of that field and no other. The box takes the field's look: its
// edge answers hover and turns primary with a halo on focus. The text area
// inside goes bare and keeps the same ref as the bar.
export function MarkdownField({
  target,
  value,
  onChange,
  children,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (text: string) => void;
  children: ReactNode;
}) {
  const preview = useMathPreview(target, value);
  return (
    <div className="relative flex flex-col rounded-lg border border-input bg-surface transition-[border-color,box-shadow] duration-150 ease-out not-focus-within:hover:border-foreground/60 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
      {preview && (
        // The formula under the caret, rendered, while it is typed. It floats
        // above the box, so it never covers the text being edited, and takes
        // no clicks. Screen readers have the source in the box.
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-full left-2 z-20 mb-2.5 flex max-w-[calc(100%-1rem)] origin-bottom-left animate-pop-in flex-col gap-1 rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md motion-reduce:animate-none"
        >
          <span className="text-[11px] text-muted-foreground">
            Vista previa
          </span>
          <div className="max-h-40 overflow-auto">
            <Formula tex={preview.tex} display={preview.display} />
          </div>
          <span className="absolute -bottom-[5px] left-4 size-2.5 rotate-45 border-r border-b bg-popover" />
        </div>
      )}
      {children}
      <div className="flex items-center gap-2 border-t px-1.5 py-1">
        <FormatBar target={target} value={value} onChange={onChange} />
        <span className="ml-auto hidden pr-1.5 text-xs text-muted-foreground sm:block">
          Ecuaciones con $…$
        </span>
      </div>
    </div>
  );
}

// The math under the caret of a focused box, or null. The caret moves without
// a change of value (arrows, clicks), so it is read on those events too.
function useMathPreview(
  target: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  const [preview, setPreview] = useState<ReturnType<typeof mathAt>>(null);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const read = () =>
      setPreview(
        document.activeElement === el && el.selectionStart === el.selectionEnd
          ? mathAt(el.value, el.selectionStart)
          : null,
      );
    const hide = () => setPreview(null);
    const events = ["input", "keyup", "click", "focus", "select"] as const;
    for (const e of events) el.addEventListener(e, read);
    el.addEventListener("blur", hide);
    read();
    return () => {
      for (const e of events) el.removeEventListener(e, read);
      el.removeEventListener("blur", hide);
    };
  }, [target, value]);
  return preview;
}

// What Enter does in a Markdown box: in a list item it opens the next item,
// with Ctrl or Cmd it submits. True when it handled the key.
export function markdownKey(
  e: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (text: string) => void,
  onSubmit?: () => void,
): boolean {
  if (e.key !== "Enter") return false;
  if (e.metaKey || e.ctrlKey) {
    if (!onSubmit) return false;
    e.preventDefault();
    onSubmit();
    return true;
  }
  const el = e.currentTarget;
  if (e.shiftKey || e.altKey || el.selectionStart !== el.selectionEnd)
    return false;
  const next = continueList(value, el.selectionStart);
  if (!next) return false;
  e.preventDefault();
  onChange(next.text);
  requestAnimationFrame(() => el.setSelectionRange(next.start, next.end));
  return true;
}

type MarkdownTextareaProps = Omit<
  ComponentProps<typeof Textarea>,
  "value" | "onChange" | "onKeyDown"
> & {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
};

// A text box for Markdown: Enter continues lists, Ctrl or Cmd with Enter
// submits. It is bare, for use inside a MarkdownField.
export function MarkdownTextarea({
  value,
  onChange,
  onSubmit,
  ...props
}: MarkdownTextareaProps) {
  return (
    <Textarea
      appearance="bare"
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => markdownKey(e, value, onChange, onSubmit)}
    />
  );
}
