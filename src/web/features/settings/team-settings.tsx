import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTeam } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { SkeletonRows } from "@/ui/skeleton";
import { DetailsSection } from "./details-section";
import { LabelsSection } from "./labels-section";
import { MembersSection } from "./members-section";

// Members and labels of a team. The server lets only leaders and admins change
// them, so a member sees the page but the changes fail with a reason.
export function TeamSettings({ team }: { team: string }) {
  const q = useTeam(team);
  if (q.isPending) return <SkeletonRows rows={4} />;
  if (q.isError) return <EmptyState title="Equipo no encontrado" />;
  const detail = q.data;
  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex min-h-12 items-center gap-2 border-b px-4 py-2">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="-ml-2"
          aria-label={`Volver a ${detail.name}`}
        >
          <Link to="/t/$team" params={{ team }}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-sm font-semibold">Ajustes de {detail.name}</h1>
      </header>
      <DetailsSection
        team={team}
        name={detail.name}
        description={detail.description}
      />
      <MembersSection team={team} members={detail.members} />
      <LabelsSection teamId={detail.id} />
    </div>
  );
}
