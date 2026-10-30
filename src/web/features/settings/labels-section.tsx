import { useState } from "react";
import { LabelChip } from "@/features/tasks/label-chip";
import { useTeamLabels } from "@/features/tasks/hooks";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { useCreateLabel } from "./hooks";
import { Section } from "./section";

export function LabelsSection({ teamId }: { teamId: string }) {
  const labels = useTeamLabels(teamId);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const create = useCreateLabel();
  return (
    <Section title="Etiquetas">
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {labels?.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Todavía no hay etiquetas.
          </span>
        )}
        {labels?.map((l) => (
          <span
            key={l.id}
            title={l.team_id ? undefined : "Compartida por todos los equipos"}
          >
            <LabelChip label={l} />
          </span>
        ))}
      </div>
      <form
        className="flex items-center gap-2 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate(
            { team_id: teamId, name: name.trim(), color },
            { onSuccess: () => setName("") },
          );
        }}
      >
        <Input
          type="color"
          aria-label="Color de la etiqueta"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-9 shrink-0 cursor-pointer p-1"
        />
        <Input
          aria-label="Nombre de la nueva etiqueta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva etiqueta, como paper o idea"
          maxLength={40}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!name.trim() || create.isPending}
        >
          Agregar
        </Button>
      </form>
    </Section>
  );
}
