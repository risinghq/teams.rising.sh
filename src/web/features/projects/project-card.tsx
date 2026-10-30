import { Link } from "@tanstack/react-router";
import { Flag, Repeat } from "lucide-react";
import type { Project } from "@shared/types";
import { shortDay } from "@/lib/dates";
import { summaryOf } from "@/lib/text";

// A project or area with the counts the server computed. Both show progress
// and the open tasks; a project, which ends on a date, also shows the date it
// ends and the next due date among its open tasks.
export function ProjectCard({ project }: { project: Project }) {
  const { open, progress, next_due: nextDue } = project;
  const percent = Math.round(progress * 100);
  const area = !project.target_date;
  const Kind = area ? Repeat : Flag;
  const about = summaryOf(project.description);
  return (
    <Link
      to="."
      search={(prev: Record<string, unknown>) => ({
        ...prev,
        project: project.id,
      })}
      className="flex min-h-28 flex-col gap-1 rounded-xl bg-surface p-4 shadow-card transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Kind size={12} aria-hidden /> {area ? "Área" : "Proyecto"}
      </span>
      <span className="truncate text-sm font-semibold">{project.name}</span>
      {about && (
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {about}
        </span>
      )}
      <span className="mt-auto flex flex-col gap-1.5 pt-3 text-xs tabular-nums text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </span>
          {percent}%
          {project.target_date && ` · ${shortDay(project.target_date)}`}
        </span>
        <span>
          {open === 1 ? "1 abierta" : `${open} abiertas`}
          {!area &&
            ` · ${nextDue ? `próxima ${shortDay(nextDue)}` : "sin fecha próxima"}`}
        </span>
      </span>
    </Link>
  );
}
