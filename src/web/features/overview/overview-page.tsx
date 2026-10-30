import { Link } from "@tanstack/react-router";
import type { OverviewRow } from "@/api";
import { cn } from "@/lib/cn";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { GroupHeading, PageHeader } from "@/ui/page-header";
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
    <div className="flex flex-col items-end">
      <span
        className={cn("text-sm font-semibold tabular-nums", value > 0 && tone)}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

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
                size={24}
              />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">
              {r.name}
            </span>
            <Stat label="Abiertas" value={r.open} />
            <Stat label="Bloqueada" value={r.blocked} tone="text-destructive" />
            <Stat label="Atrasadas" value={r.overdue} tone="text-destructive" />
            <Stat label="Hecha" value={r.done} />
          </>
        );
        const row = "flex items-center gap-4 border-b px-4 py-3";
        return (
          <li key={r.key ?? r.id}>
            {link && r.key ? (
              <Link
                to="/t/$team"
                params={{ team: r.key }}
                className={cn(row, "hover:bg-muted/60")}
              >
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewPage() {
  const q = useOverview();
  return (
    <div>
      <PageHeader title="Resumen" />
      {q.isPending ? (
        <SkeletonRows />
      ) : (
        <>
          <GroupHeading>Equipos</GroupHeading>
          <Rows rows={q.data?.teams ?? []} link />
          <GroupHeading>Personas</GroupHeading>
          <Rows rows={q.data?.owners ?? []} />
        </>
      )}
    </div>
  );
}
