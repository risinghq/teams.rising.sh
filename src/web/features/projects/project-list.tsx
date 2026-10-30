import { Plus } from "lucide-react";
import { useState } from "react";
import type { Project } from "@shared/types";
import { Button } from "@/ui/button";
import { useCreateProject } from "./hooks";
import { ProjectCard } from "./project-card";
import { ProjectForm } from "./project-form";

export function ProjectList({
  team,
  projects,
  canCreate,
}: {
  team: string;
  projects: Project[];
  canCreate: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const create = useCreateProject();
  const live = projects.filter((p) => p.status === "active");
  const ordered = [
    ...live.filter((p) => p.target_date),
    ...live.filter((p) => !p.target_date),
  ];
  if (ordered.length === 0 && !canCreate) return null;
  return (
    <section aria-label="Proyectos" className="pb-8">
      {/* A swipeable row on phones so the tasks stay in view; a grid above. */}
      <div className="-mx-4 grid snap-x scroll-px-4 auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:snap-start">
        {ordered.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {canCreate && !adding && (
          <Button
            variant="plain"
            size="auto"
            onClick={() => setAdding(true)}
            className="min-h-28 flex-col items-center justify-center gap-1 whitespace-normal rounded-xl border border-dashed p-4 text-muted-foreground hover:border-foreground/40 hover:bg-surface"
          >
            <Plus size={16} />
            <span className="text-xs">Nuevo proyecto o área</span>
          </Button>
        )}
      </div>
      {adding && (
        <div className="mt-3 rounded-xl bg-surface shadow-card">
          <ProjectForm
            pending={create.isPending}
            error={create.error}
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
