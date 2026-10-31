import { X } from "lucide-react";
import { useState } from "react";
import type { Label } from "@shared/types";
import { LabelChip } from "@/features/tasks/label-chip";
import { useTeamLabels } from "@/features/tasks/hooks";
import { useMe, useTeamRole } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { FormError } from "@/ui/form-error";
import { IconButton } from "@/ui/icon-button";
import { Input } from "@/ui/input";
import { useCreateLabel, useDeleteLabel } from "./hooks";
import { Section } from "./section";

type TeamLabel = Label & { team_id: string | null };

export function LabelsSection({
  team,
  teamId,
}: {
  team: string;
  teamId: string;
}) {
  const labels = useTeamLabels(teamId);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const create = useCreateLabel();
  const leader = useTeamRole(team) === "leader";
  const admin = useMe().data?.is_admin ?? false;
  // Leaders delete their team's labels; a shared label is for an admin.
  const canDelete = (l: TeamLabel) => (l.team_id ? leader : admin);
  return (
    <Section title="Etiquetas">
      {labels?.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Todavía no hay etiquetas.
        </p>
      ) : (
        <ul className="divide-y">
          {labels?.map((l) => (
            <LabelRow key={l.id} label={l} canDelete={canDelete(l)} />
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-center gap-2 border-t px-4 py-4"
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
          autoComplete="off"
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
        <FormError error={create.error} className="basis-full" />
      </form>
    </Section>
  );
}

function LabelRow({
  label,
  canDelete,
}: {
  label: TeamLabel;
  canDelete: boolean;
}) {
  const remove = useDeleteLabel();
  const [asking, setAsking] = useState(false);
  return (
    <li className="flex min-h-11 items-center gap-2 px-4 py-1.5">
      <LabelChip label={label} />
      {!label.team_id && (
        <span className="text-xs text-muted-foreground">
          Compartida por todos los equipos
        </span>
      )}
      {canDelete && (
        <>
          <IconButton
            label={`Borrar la etiqueta ${label.name}`}
            size="icon-xs"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => setAsking(true)}
          >
            <X />
          </IconButton>
          <ConfirmDialog
            open={asking}
            onOpenChange={setAsking}
            title={`¿Borrar la etiqueta ${label.name}?`}
            confirm="Borrar etiqueta"
            onConfirm={() => remove.mutate({ id: label.id })}
          >
            {label.team_id
              ? "Se quita de todas las tareas del equipo que la tienen."
              : "Es compartida: se quita de las tareas de todos los equipos."}{" "}
            No se puede deshacer.
          </ConfirmDialog>
        </>
      )}
    </li>
  );
}
