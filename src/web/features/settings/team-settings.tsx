import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTeam } from "@/features/teams/hooks";
import { buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { Page, PageHeader } from "@/ui/page-header";
import { SkeletonRows } from "@/ui/skeleton";
import { DetailsSection } from "./details-section";
import { LabelsSection } from "./labels-section";
import { MembersSection } from "./members-section";

// Members and labels of a team. The server lets only leaders and admins change
// them, so a member sees the page but the changes fail with a reason.
export function TeamSettings({ team }: { team: string }) {
  const q = useTeam(team);
  if (q.isPending)
    return (
      <Page width="form">
        <SkeletonRows rows={4} />
      </Page>
    );
  if (q.isError)
    return (
      <EmptyState
        as="h1"
        title="Equipo no encontrado"
        action={
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        }
      >
        Puede que no exista o que no seas miembro.
      </EmptyState>
    );
  const detail = q.data;
  return (
    <Page width="form">
      <PageHeader
        title={`Ajustes de ${detail.name}`}
        action={
          <Link
            to="/t/$team"
            params={{ team }}
            className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft size={14} aria-hidden /> Volver a {detail.name}
          </Link>
        }
      />
      <DetailsSection
        team={team}
        name={detail.name}
        imageUrl={detail.image_url}
      />
      <MembersSection team={team} members={detail.members} />
      <LabelsSection team={team} teamId={detail.id} />
    </Page>
  );
}
