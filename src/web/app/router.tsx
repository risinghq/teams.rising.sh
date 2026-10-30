import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { CalendarPage } from "@/features/calendar/calendar-page";
import { parseCalendarSearch } from "@/features/calendar/search";
import { Login } from "@/features/auth/login";
import { InboxPage } from "@/features/inbox/inbox-page";
import { Privacy, Terms } from "@/features/legal/legal";
import { OverviewPage } from "@/features/overview/overview-page";
import { NewTeam } from "@/features/settings/new-team";
import { TeamSettings } from "@/features/settings/team-settings";
import { MyWork } from "@/features/tasks/my-work";
import { parseMyWorkSearch, parseTeamSearch } from "@/features/tasks/search";
import { TaskView } from "@/features/tasks/task-view";
import { TeamPage } from "@/features/teams/team-page";
import { today } from "@/lib/dates";
import { Shell } from "./shell";

const root = createRootRoute({ component: Outlet });
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: (s: Record<string, unknown>): { error?: string } =>
    typeof s.error === "string" ? { error: s.error } : {},
  component: function LoginPage() {
    return <Login error={login.useSearch().error} />;
  },
});
const privacy = createRoute({
  getParentRoute: () => root,
  path: "/privacidad",
  component: Privacy,
});
const terms = createRoute({
  getParentRoute: () => root,
  path: "/terminos",
  component: Terms,
});
const shell = createRoute({
  getParentRoute: () => root,
  id: "shell",
  component: Shell,
});

const home = createRoute({
  getParentRoute: () => shell,
  path: "/",
  validateSearch: parseMyWorkSearch,
  component: MyWork,
});
const inbox = createRoute({
  getParentRoute: () => shell,
  path: "/inbox",
  component: InboxPage,
});
const calendar = createRoute({
  getParentRoute: () => shell,
  path: "/calendar",
  validateSearch: (s: Record<string, unknown>) =>
    parseCalendarSearch(s, today()),
  component: CalendarPage,
});
const overview = createRoute({
  getParentRoute: () => shell,
  path: "/overview",
  component: OverviewPage,
});
const team = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team",
  validateSearch: parseTeamSearch,
  component: function Team() {
    return <TeamPage team={team.useParams().team} />;
  },
});
const newTeam = createRoute({
  getParentRoute: () => shell,
  path: "/teams/new",
  component: NewTeam,
});
const settings = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team/settings",
  component: function Settings() {
    return <TeamSettings team={settings.useParams().team} />;
  },
});
const task = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team/$number",
  component: function TaskPage() {
    const { team: k, number } = task.useParams();
    const navigate = useNavigate();
    return (
      <div className="mx-auto max-w-2xl">
        <TaskView
          taskKey={`${k}-${number}`}
          onClose={() => void navigate({ to: "/t/$team", params: { team: k } })}
        />
      </div>
    );
  },
});

export const router = createRouter({
  routeTree: root.addChildren([
    login,
    privacy,
    terms,
    shell.addChildren([
      home,
      inbox,
      calendar,
      overview,
      newTeam,
      team,
      settings,
      task,
    ]),
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
