import { useState } from "react";
import type { ProjectBase } from "@shared/types";
import { PROJECT_STATUS_LABEL } from "@/lib/domain";
import { Button } from "@/ui/button";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";
import { Select } from "@/ui/select";
import { Textarea } from "@/ui/textarea";

// Creates a project, or edits one when `project` is given. An empty target date
// makes an area.
export function ProjectForm({
  project,
  pending,
  error,
  onSave,
  onCancel,
}: {
  project?: ProjectBase;
  pending: boolean;
  error?: Error | null;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [target, setTarget] = useState(project?.target_date ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "active");
  return (
    <form
      className="flex flex-col gap-2 px-4 py-3"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          name: name.trim(),
          target_date: target || null,
          description,
          ...(project && { status }),
        });
      }}
    >
      <Input
        aria-label="Nombre del proyecto"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Input
          type="date"
          aria-label="Fecha objetivo"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-auto"
        />
        Deja la fecha vacía para un área permanente.
        {project && (
          <Select
            aria-label="Estado del proyecto"
            size="sm"
            className="ml-auto w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectBase["status"])}
          >
            {(Object.keys(PROJECT_STATUS_LABEL) as ProjectBase["status"][]).map(
              (s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ),
            )}
          </Select>
        )}
      </div>
      <Textarea
        aria-label="Descripción del proyecto"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="De qué trata, con enlaces a su repo u hoja de cálculo"
        rows={3}
      />
      <div className="flex items-center justify-end gap-2">
        <FormError error={error ?? null} className="mr-auto" />
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {project ? "Guardar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
