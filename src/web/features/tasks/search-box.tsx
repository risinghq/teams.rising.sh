import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Input } from "@/ui/input";

// A text filter that follows the URL. Typing waits for a pause before it
// commits, so the URL and the list do not change on every key. A change that
// did not come from this box, such as the back button, replaces the text.
export function SearchBox({
  value,
  onCommit,
  label,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }
  const commit = useEffectEvent((next: string) => {
    committed.current = next;
    onCommit(next);
  });
  useEffect(() => {
    const next = draft.trim();
    if (next === committed.current) return;
    const id = setTimeout(() => commit(next), 250);
    return () => clearTimeout(id);
  }, [draft]);
  return (
    <Input
      type="search"
      size="sm"
      aria-label={label}
      placeholder="Buscar"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className={className}
    />
  );
}
