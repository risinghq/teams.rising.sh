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
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted";
const NAV_LINK_ON = { className: "bg-muted font-medium" };

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
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="font-semibold">Teams</span>
        <Button
          variant="outline"
          size="xs"
          className="mr-8 text-muted-foreground md:mr-0"
          aria-label="Buscar"
          onClick={onSearch}
        >
          <Search /> ⌘K
        </Button>
      </div>
      <nav className="flex flex-col gap-0.5" onClick={onNavigate}>
        <Link
          to="/"
          className={NAV_LINK}
          activeProps={NAV_LINK_ON}
          activeOptions={{ exact: true }}
        >
          <CheckSquare size={16} /> Mi trabajo
        </Link>
        <Link to="/inbox" className={NAV_LINK} activeProps={NAV_LINK_ON}>
          <Bell size={16} /> Bandeja
          {unread > 0 && (
            <span
              aria-label={`${unread} sin leer`}
              className="ml-auto h-2 w-2 rounded-full bg-primary"
            />
          )}
        </Link>
        <Link to="/calendar" className={NAV_LINK} activeProps={NAV_LINK_ON}>
          <CalendarDays size={16} /> Calendario
        </Link>
        <Link to="/overview" className={NAV_LINK} activeProps={NAV_LINK_ON}>
          <LayoutDashboard size={16} /> Resumen
        </Link>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto" onClick={onNavigate}>
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-medium text-muted-foreground">Equipos</p>
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
            <TeamMark teamKey={t.key} size={18} />
            <span className="min-w-0 flex-1 truncate">{t.name}</span>
          </Link>
        ))}
      </div>
      {me.data && (
        <div className="flex items-center gap-2 border-t px-2 pt-3">
          <PersonAvatar person={me.data} size={24} />
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
