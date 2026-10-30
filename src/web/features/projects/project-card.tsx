import { Flag, Repeat } from "lucide-react";
import { shortDay } from "@/lib/dates";
import type { ProjectSummary } from "@/lib/tasks";
import { summaryOf } from "@/lib/text";
import { Button } from "@/ui/button";

export function ProjectCard({
  summary: { project, open, progress, nextDue },
  onPick,
}: {
  summary: ProjectSummary;
  onPick: (project: string) => void;
}) {
  const area = !project.target_date;
  const Kind = area ? Repeat : Flag;
  const about = summaryOf(project.description);
  return (
    <Button
      variant="plain"
      size="auto"
      onClick={() => onPick(project.id)}
      className="min-h-28 flex-col items-stretch justify-start gap-1 whitespace-normal rounded-lg bg-surface p-3 shadow-card hover:ring-2 hover:ring-primary/30"
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Kind size={12} aria-hidden /> {area ? "Área" : "Proyecto"}
      </span>
      <span className="truncate font-medium">{project.name}</span>
      {about && (
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {about}
        </span>
      )}
      <span className="mt-auto flex items-center gap-2 pt-2 text-xs tabular-nums text-muted-foreground">
        {area ? (
          nextDue ? (
            `${open} abiertas · próxima ${shortDay(nextDue)}`
          ) : (
            `${open} abiertas`
          )
        ) : (
          <>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
            {Math.round(progress * 100)}% ·{" "}
            {shortDay(project.target_date as string)}
          </>
        )}
      </span>
    </Button>
  );
}
