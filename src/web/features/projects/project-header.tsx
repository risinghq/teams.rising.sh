import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Project } from "@/api";
import { shortDay } from "@/lib/dates";
import { PROJECT_STATUS_LABEL } from "@/lib/domain";
import { LinkedText } from "@/features/tasks/linked-text";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { usePatchProject } from "./hooks";
import { ProjectForm } from "./project-form";

// The picked project, or the tasks outside any project when `project` is null.
export function ProjectHeader({
  team,
  project,
  canEdit,
  onBack,
}: {
  team: string;
  project: Project | null;
  canEdit: boolean;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const save = usePatchProject();
  if (editing && project)
    return (
      <section className="border-b">
        <ProjectForm
          project={project}
          pending={save.isPending}
          onCancel={() => setEditing(false)}
          onSave={(body) =>
            save.mutate(
              { team, id: project.id, body },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      </section>
    );
  return (
    <section className="flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <IconButton
          label="Todos los proyectos"
          className="-ml-2"
          onClick={onBack}
        >
          <ArrowLeft />
        </IconButton>
        <h2 className="font-semibold">{project?.name ?? "Sin proyecto"}</h2>
        <span className="text-xs text-muted-foreground">
          {!project
            ? "Ideas, papers y otras tareas sueltas"
            : project.target_date
              ? `Meta ${shortDay(project.target_date)}`
              : "Área permanente"}
          {project &&
            project.status !== "active" &&
            ` · ${PROJECT_STATUS_LABEL[project.status].toLowerCase()}`}
        </span>
        {project && canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setEditing(true)}
          >
            Editar
          </Button>
        )}
      </div>
      {project?.description && (
        <p className="whitespace-pre-wrap text-sm">
          <LinkedText text={project.description} />
        </p>
      )}
    </section>
  );
}
