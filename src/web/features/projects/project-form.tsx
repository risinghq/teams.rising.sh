import { useId, useRef, useState } from "react";
import type { ProjectBase } from "@shared/types";
import { finePointer } from "@/lib/device";
import { PROJECT_STATUS_LABEL } from "@/lib/domain";
import { MarkdownField, MarkdownTextarea } from "@/features/tasks/format-bar";
import { Button } from "@/ui/button";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select } from "@/ui/select";

// Creates a project, or edits one when `project` is given. An empty target date
// makes an area. Only the description takes formatting: the name is a title.
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
  const id = useId();
  const box = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState(project?.name ?? "");
  const [target, setTarget] = useState(project?.target_date ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "active");
  const submit = () => {
    if (!name.trim() || pending) return;
    onSave({
      name: name.trim(),
      target_date: target || null,
      description,
      ...(project && { status }),
    });
  };
  return (
    <form
      className="flex flex-col gap-3 px-4 py-3"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Nombre</Label>
        <Input
          id={`${id}-name`}
          autoFocus={finePointer()}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Web del Fenómeno del Niño"
          maxLength={100}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-target`}>Fecha objetivo</Label>
          <Input
            id={`${id}-target`}
            type="date"
            aria-describedby={`${id}-target-hint`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-auto"
          />
        </div>
        <p
          id={`${id}-target-hint`}
          className="pb-2 text-xs text-muted-foreground"
        >
          Déjala vacía para un área permanente.
        </p>
        {project && (
          <div className="ml-auto flex flex-col gap-1.5">
            <Label htmlFor={`${id}-status`}>Estado</Label>
            <Select
              id={`${id}-status`}
              className="w-auto"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ProjectBase["status"])
              }
            >
              {(
                Object.keys(PROJECT_STATUS_LABEL) as ProjectBase["status"][]
              ).map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-description`}>Descripción</Label>
        <MarkdownField
          target={box}
          value={description}
          onChange={setDescription}
        >
          <MarkdownTextarea
            ref={box}
            id={`${id}-description`}
            value={description}
            onChange={setDescription}
            onSubmit={submit}
            placeholder="De qué trata, con enlaces a su repo u hoja de cálculo"
            rows={4}
          />
        </MarkdownField>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FormError error={error ?? null} />
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending
              ? project
                ? "Guardando…"
                : "Creando…"
              : project
                ? "Guardar"
                : "Crear"}
          </Button>
        </div>
      </div>
    </form>
  );
}
