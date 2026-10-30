import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Project } from "@shared/types";
import { shortDay } from "@/lib/dates";
import { PROJECT_STATUS_LABEL } from "@/lib/domain";
import { LinkedText } from "@/features/tasks/linked-text";
import { Button } from "@/ui/button";
import { usePatchProject } from "./hooks";
import { ProjectForm } from "./project-form";

export function ProjectHeader({
  team,
  project,
  canEdit,
}: {
  team: string;
  project: Project;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const save = usePatchProject();
  if (editing)
    return (
      <section className="mb-6 rounded-xl bg-surface shadow-card">
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
    <section className="mb-6 flex flex-col gap-3">
      <Link
        to="."
        search={(prev: Record<string, unknown>) => ({
          ...prev,
          project: undefined,
        })}
        className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft size={14} aria-hidden /> Todos los proyectos
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <span className="text-xs text-muted-foreground">
          {project.target_date
            ? `Meta ${shortDay(project.target_date)}`
            : "Área permanente"}
          {project.status !== "active" &&
            ` · ${PROJECT_STATUS_LABEL[project.status].toLowerCase()}`}
        </span>
        {canEdit && (
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
      {project.description && (
        <p className="whitespace-pre-wrap text-sm">
          <LinkedText text={project.description} />
        </p>
      )}
    </section>
  );
}
