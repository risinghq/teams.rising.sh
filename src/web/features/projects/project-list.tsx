import { Inbox, Plus } from "lucide-react";
import { useState } from "react";
import type { summarizeProjects } from "@/lib/tasks";
import { Button } from "@/ui/button";
import { useCreateProject } from "./hooks";
import { ProjectCard } from "./project-card";
import { ProjectForm } from "./project-form";

// The team's live projects and areas as cards, plus the tasks outside them.
// Picking a card filters the list below.
export function ProjectList({
  team,
  summary,
  canCreate,
  onPick,
}: {
  team: string;
  summary: ReturnType<typeof summarizeProjects>;
  canCreate: boolean;
  onPick: (project: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const create = useCreateProject();
  const empty = summary.projects.length === 0 && summary.areas.length === 0;
  if (empty && !canCreate) return null;
  return (
    <section className="border-b px-4 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xs font-medium">Proyectos y áreas</h2>
        <p className="text-xs text-muted-foreground">
          Los proyectos terminan en una fecha. Las áreas, como financiamiento,
          siguen abiertas.
        </p>
      </div>
      {/* A swipeable row on phones so the tasks stay in view; a grid above. */}
      <div className="-mx-4 grid snap-x scroll-px-4 auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:snap-start">
        {[...summary.projects, ...summary.areas].map((s) => (
          <ProjectCard key={s.project.id} summary={s} onPick={onPick} />
        ))}
        {!empty && summary.loose > 0 && (
          <Button
            variant="plain"
            size="auto"
            onClick={() => onPick("none")}
            className={DASHED_CARD}
          >
            <span className="flex items-center gap-1 text-xs">
              <Inbox size={12} aria-hidden /> Sueltas
            </span>
            <span className="font-medium text-foreground">Sin proyecto</span>
            <span className="line-clamp-1 text-xs">
              Ideas, papers y otras tareas sueltas
            </span>
            <span className="mt-auto pt-2 text-xs tabular-nums">
              {summary.loose} abiertas
            </span>
          </Button>
        )}
        {canCreate && !adding && (
          <Button
            variant="plain"
            size="auto"
            onClick={() => setAdding(true)}
            className={`${DASHED_CARD} items-center justify-center`}
          >
            <Plus size={16} />
            <span className="text-xs font-medium">Nuevo proyecto o área</span>
          </Button>
        )}
      </div>
      {adding && (
        <div className="mt-3 rounded-lg bg-surface shadow-card">
          <ProjectForm
            pending={create.isPending}
            onCancel={() => setAdding(false)}
            onSave={(body) =>
              create.mutate(
                { team, body },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </div>
      )}
    </section>
  );
}

const DASHED_CARD =
  "min-h-28 flex-col items-stretch justify-start gap-1 whitespace-normal rounded-lg border border-dashed p-3 text-muted-foreground hover:border-foreground/40 hover:bg-surface";
