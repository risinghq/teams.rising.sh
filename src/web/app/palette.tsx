import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { searchPalette, type PaletteItem } from "@/lib/palette";
import { useTasks } from "@/features/tasks/hooks";
import { useTeams } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
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
        className="max-w-lg gap-0 overflow-hidden rounded-lg p-0"
      >
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <PaletteBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const teams = useTeams();
  const tasks = useTasks({ top: "0" });
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);

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
      ...(tasks.data ?? []).map((t) => ({
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
      <ul className="max-h-80 overflow-y-auto p-1">
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">
            No hay coincidencias.
          </li>
        )}
        {results.map((r, i) => (
          <li key={r.id}>
            <Button
              variant="plain"
              size="auto"
              onClick={() => go(r)}
              onMouseEnter={() => setAt(i)}
              className={cn(
                "w-full justify-start gap-3 rounded-md px-3 py-2",
                i === at && "bg-muted",
              )}
            >
              <span className="w-16 shrink-0 text-xs text-muted-foreground">
                {r.hint || KIND[r.kind]}
              </span>
              <span className="truncate">{r.label}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
