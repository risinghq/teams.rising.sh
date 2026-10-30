import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Plus,
  Search,
} from "lucide-react";
import { api } from "@/api";
import { useInbox } from "@/features/inbox/hooks";
import { useMe, useTeams } from "@/features/teams/hooks";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { TeamMark } from "@/features/teams/team-mark";
import { Button } from "@/ui/button";

const NAV_LINK =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";
const NAV_LINK_ON = { className: "bg-muted/60 font-semibold text-foreground" };

// The sidebar's content, shared by the fixed column and the phone drawer.
// `onNavigate` lets the drawer close when a link is followed.
export function SidebarContent({
  onSearch,
  onNavigate,
}: {
  onSearch: () => void;
  onNavigate?: () => void;
}) {
  const me = useMe();
  const teams = useTeams();
  const unread = useInbox().data?.unread ?? 0;
  return (
    <>
      <div className="flex flex-col gap-4">
        <span className="px-3 pt-1 text-base font-semibold">Teams</span>
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search size={16} aria-hidden />
          <span className="flex-1 text-left">Buscar</span>
          <kbd className="hidden text-xs md:block">⌘K</kbd>
        </button>
      </div>
      <nav
        aria-label="Principal"
        className="flex flex-col gap-1"
        onClick={onNavigate}
      >
        <Link
          to="/"
          className={NAV_LINK}
          activeProps={NAV_LINK_ON}
          activeOptions={{ exact: true, includeSearch: false }}
        >
          <CheckSquare size={16} aria-hidden /> Mi trabajo
        </Link>
        <Link to="/inbox" className={NAV_LINK} activeProps={NAV_LINK_ON}>
          <Bell size={16} aria-hidden /> Bandeja
          {unread > 0 && (
            <span
              role="img"
              aria-label={`${unread} sin leer`}
              className="ml-auto size-2 rounded-full bg-primary"
            />
          )}
        </Link>
        <Link to="/calendar" className={NAV_LINK} activeProps={NAV_LINK_ON}>
          <CalendarDays size={16} aria-hidden /> Calendario
        </Link>
        <Link to="/overview" className={NAV_LINK} activeProps={NAV_LINK_ON}>
          <LayoutDashboard size={16} aria-hidden /> Resumen
        </Link>
      </nav>
      <nav
        aria-label="Equipos"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
        onClick={onNavigate}
      >
        <div className="flex items-center justify-between px-3 pb-1">
          <h2 className="text-xs text-muted-foreground">Equipos</h2>
          {me.data?.is_admin && (
            <Button
              asChild
              variant="ghost"
              size="icon-xs"
              aria-label="Nuevo equipo"
              className="text-muted-foreground"
            >
              <Link to="/teams/new">
                <Plus />
              </Link>
            </Button>
          )}
        </div>
        {teams.data?.map((t) => (
          <Link
            key={t.key}
            to="/t/$team"
            params={{ team: t.key }}
            className={NAV_LINK}
            activeProps={NAV_LINK_ON}
          >
            <TeamMark teamKey={t.key} size={20} />
            <span className="min-w-0 flex-1 truncate">{t.name}</span>
          </Link>
        ))}
      </nav>
      {me.data && (
        <div className="flex items-center gap-3 border-t px-3 pt-4">
          <PersonAvatar person={me.data} size={28} />
          <span className="min-w-0 flex-1 truncate text-xs">
            {me.data.name}
          </span>
          <Button
            variant="link"
            size="xs"
            className="text-muted-foreground"
            onClick={async () => {
              await api.logout();
              window.location.assign("/login");
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      )}
    </>
  );
}
