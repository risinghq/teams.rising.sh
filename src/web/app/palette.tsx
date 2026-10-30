import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDebounced } from "@/hooks/use-debounced";
import { cn } from "@/lib/cn";
import { searchPalette, type PaletteItem } from "@/lib/palette";
import { usePeekTasks } from "@/features/tasks/hooks";
import { useTeams } from "@/features/teams/hooks";
import { Dialog, DialogContent, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";

const KIND: Record<PaletteItem["kind"], string> = {
  task: "tarea",
  team: "equipo",
  screen: "pantalla",
};

const SCREENS: PaletteItem[] = [
  { id: "s-work", kind: "screen", label: "Mi trabajo", hint: "", to: "/" },
  { id: "s-inbox", kind: "screen", label: "Bandeja", hint: "", to: "/inbox" },
  {
    id: "s-cal",
    kind: "screen",
    label: "Calendario",
    hint: "",
    to: "/calendar",
  },
  { id: "s-over", kind: "screen", label: "Resumen", hint: "", to: "/overview" },
];

export function Palette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        placement="top"
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-w-lg gap-0 overflow-hidden rounded-xl p-0"
      >
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <PaletteBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// The server searches by one word. The client checks every word before showing
// the result.
const longestWord = (q: string) =>
  q
    .split(/\s+/)
    .reduce((best, word) => (word.length > best.length ? word : best), "");

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const teams = useTeams();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const term = useDebounced(longestWord(q), 200);
  const tasks = usePeekTasks({ q: term }, 20, term !== "");

  const items = useMemo<PaletteItem[]>(
    () => [
      ...SCREENS,
      ...(teams.data ?? []).map((t) => ({
        id: `t-${t.key}`,
        kind: "team" as const,
        label: t.name,
        hint: t.key,
        to: `/t/${t.key}`,
      })),
      ...(tasks.data?.items ?? []).map((t) => ({
        id: `k-${t.key}`,
        kind: "task" as const,
        label: t.title,
        hint: t.key,
        to: `/t/${t.team}/${t.number}`,
      })),
    ],
    [teams.data, tasks.data],
  );
  const results = searchPalette(items, q);

  const go = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    void navigate({ to: item.to });
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setAt((i) => Math.min(i + 1, results.length - 1));
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setAt((i) => Math.max(i - 1, 0));
        }
        if (e.key === "Enter") go(results[at]);
      }}
    >
      <Input
        aria-label="Buscar"
        appearance="bare"
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAt(0);
        }}
        placeholder="Ir a una tarea, equipo o pantalla"
        className="h-12 rounded-none border-b px-4"
      />
      <ul className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No hay coincidencias.
          </li>
        )}
        {results.map((r, i) => (
          <li key={r.id}>
            <Link
              to={r.to}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                  return;
                e.preventDefault();
                go(r);
              }}
              onMouseEnter={() => setAt(i)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                i === at && "bg-muted",
              )}
            >
              <span className="w-16 shrink-0 text-xs text-muted-foreground">
                {r.hint || KIND[r.kind]}
              </span>
              <span className="truncate">{r.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
