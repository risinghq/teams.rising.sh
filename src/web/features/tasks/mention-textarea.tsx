import { type ComponentProps, useId, useRef, useState } from "react";
import type { User } from "@shared/types";
import { cn } from "@/lib/cn";
import {
  insertMention,
  matchPeople,
  mentionAt,
  mentionHandle,
} from "@/lib/mentions";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useUsers } from "@/features/teams/hooks";
import { Textarea } from "@/ui/textarea";
import { markdownKey } from "./format-bar";

type Props = Omit<
  ComponentProps<typeof Textarea>,
  "value" | "onChange" | "onKeyDown"
> & {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
};

// A comment box that lists people after an `@`. Arrows move, Enter or Tab
// picks, Escape closes. Ctrl or Cmd with Enter submits. Enter in a list item
// opens the next one.
export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  ref: outerRef,
  ...props
}: Props) {
  const users = useUsers().data ?? [];
  const ref = useRef<HTMLTextAreaElement>(null);
  const setRef = (el: HTMLTextAreaElement | null) => {
    ref.current = el;
    if (typeof outerRef === "function") outerRef(el);
    else if (outerRef) outerRef.current = el;
  };
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const at = mentionAt(value, caret);
  const open = at !== null && dismissed !== at.start;
  const people = open ? matchPeople(users, at.query) : [];
  const shown = people.length > 0;

  const pick = (u: User) => {
    if (!at) return;
    const next = insertMention(value, at.start, caret, mentionHandle(u));
    onChange(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  const track = (el: HTMLTextAreaElement) => {
    setCaret(el.selectionStart);
    setActive(0);
  };

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={setRef}
        value={value}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target);
          setDismissed(null);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onBlur={() => setDismissed(at?.start ?? null)}
        onKeyDown={(e) => {
          if (shown) {
            const n = people.length;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
              return;
            }
            if (
              (e.key === "Enter" && !e.metaKey && !e.ctrlKey) ||
              e.key === "Tab"
            ) {
              e.preventDefault();
              const u = people[Math.min(active, n - 1)];
              if (u) pick(u);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDismissed(at?.start ?? null);
              return;
            }
          }
          markdownKey(e, value, onChange, onSubmit);
        }}
      />
      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Personas"
          className="absolute top-full left-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {people.map((u, i) => (
            <li
              key={u.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                i === active && "bg-accent text-accent-foreground",
              )}
              // Mouse down, not click: a click lands after the textarea blurs.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <PersonAvatar person={u} size={18} />
              <span className="truncate">{u.name}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                @{mentionHandle(u)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
