import { Link } from "@tanstack/react-router";
import type { OverviewRow } from "@shared/types";
import { cn } from "@/lib/cn";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { GroupHeading, Page, PageHeader } from "@/ui/page-header";
import { SkeletonRows } from "@/ui/skeleton";
import { useOverview } from "./hooks";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex w-14 flex-col items-end sm:w-20">
      <span
        className={cn("text-sm font-semibold tabular-nums", value > 0 && tone)}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

const ROW = "flex items-center gap-3 rounded-lg px-3 py-3 sm:gap-4";

function Rows({ rows, link }: { rows: OverviewRow[]; link?: boolean }) {
  return (
    <ul>
      {rows.map((r) => {
        const body = (
          <>
            {r.avatar_url !== undefined && (
              <PersonAvatar
                person={{
                  id: r.id ?? "",
                  name: r.name,
                  avatar_url: r.avatar_url,
                }}
                size={28}
              />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {r.name}
            </span>
            <Stat label="Abiertas" value={r.open} />
            <span className="hidden sm:block">
              <Stat
                label="Bloqueadas"
                value={r.blocked}
                tone="text-destructive"
              />
            </span>
            <Stat label="Atrasadas" value={r.overdue} tone="text-destructive" />
            <span className="hidden sm:block">
              <Stat label="Hechas" value={r.done} />
            </span>
          </>
        );
        return (
          <li key={r.key ?? r.id}>
            {link && r.key ? (
              <Link
                to="/t/$team"
                params={{ team: r.key }}
                className={cn(
                  ROW,
                  "transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {body}
              </Link>
            ) : (
              <div className={ROW}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewPage() {
  const q = useOverview();
  const empty = !q.isPending && !q.data?.teams.length && !q.data?.owners.length;
  return (
    <Page>
      <PageHeader
        title="Resumen"
        description="Cómo va el trabajo abierto en cada equipo y en cada persona."
      />
      {q.isPending ? (
        <SkeletonRows />
      ) : empty ? (
        <EmptyState
          title="Todavía no hay trabajo que resumir"
          action={
            <Link to="/" className={buttonVariants({ variant: "outline" })}>
              Ir a Mi trabajo
            </Link>
          }
        >
          Cuando haya tareas en tus equipos, aquí verás cuántas hay abiertas y
          cuántas van atrasadas.
        </EmptyState>
      ) : (
        <>
          <GroupHeading>Equipos</GroupHeading>
          <Rows rows={q.data?.teams ?? []} link />
          <GroupHeading>Personas</GroupHeading>
          <Rows rows={q.data?.owners ?? []} />
        </>
      )}
    </Page>
  );
}
