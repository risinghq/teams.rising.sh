import { Plus } from "lucide-react";
import { useState } from "react";
import type { Label } from "@shared/types";
import { labelKey, SUGGESTED_LABELS } from "@/lib/domain";
import { useCreateLabel } from "@/features/settings/hooks";
import { Button } from "@/ui/button";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";

// The accents of the app's palette. A label typed by hand takes the first one
// its team does not use yet; the team settings can still pick any color.
const COLORS = [
  "#8839ef",
  "#1e66f5",
  "#179299",
  "#40a02b",
  "#df8e1d",
  "#fe640b",
  "#d20f39",
  "#ea76cb",
];

// Adds a label to the task. The suggested labels the team lacks come first, a
// click away; below them any name can be typed. A name the team already has
// picks that label instead of making a second one.
export function NewLabel({
  teamId,
  labels,
  onPick,
}: {
  teamId: string;
  labels: Label[];
  onPick: (labelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateLabel();
  const close = () => {
    setOpen(false);
    setName("");
    create.reset();
  };
  if (!open)
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full border-dashed text-muted-foreground"
      >
        <Plus /> Nueva
      </Button>
    );

  const have = new Set(labels.map((l) => labelKey(l.name)));
  const typed = labelKey(name);
  const suggestions = SUGGESTED_LABELS.filter(
    (s) => !have.has(labelKey(s.name)) && labelKey(s.name).startsWith(typed),
  );
  const add = (labelName: string, color: string) => {
    const existing = labels.find(
      (l) => labelKey(l.name) === labelKey(labelName),
    );
    if (existing) {
      onPick(existing.id);
      close();
      return;
    }
    create.mutate(
      { team_id: teamId, name: labelName, color },
      {
        onSuccess: ({ id }) => {
          onPick(id);
          close();
        },
      },
    );
  };
  const used = labels.map((l) => l.color);
  const color = COLORS.find((c) => !used.includes(c)) ?? "#8839ef";

  return (
    <div className="flex basis-full flex-col gap-2 rounded-lg border bg-surface p-3">
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Sugeridas</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <Button
                key={s.name}
                variant="outline"
                size="sm"
                disabled={create.isPending}
                onClick={() => add(s.name, s.color)}
                className="rounded-full"
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (trimmed) add(trimmed, color);
        }}
      >
        <Input
          autoFocus
          size="sm"
          aria-label="Nombre de la nueva etiqueta"
          autoComplete="off"
          placeholder="Otra etiqueta"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          className="w-48"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!name.trim() || create.isPending}
        >
          Crear
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={close}
          className="ml-auto"
        >
          Cancelar
        </Button>
      </form>
      <FormError error={create.error} />
    </div>
  );
}
