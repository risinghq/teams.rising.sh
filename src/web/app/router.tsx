import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from "@tanstack/react-router";
import { parseCalendarSearch } from "@/features/calendar/search";
import { parseMyWorkSearch, parseTeamSearch } from "@/features/tasks/search";
import { today } from "@/lib/dates";
import { NotFound } from "./not-found";
import { Shell } from "./shell";

// Every screen is its own chunk, fetched when its route first matches or when
// a link to it is hovered or focused. The search parsers stay eager: they are
// small and a route needs them before it can match.
const root = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="min-h-full">
      <NotFound />
    </main>
  ),
});
const LoginScreen = lazyRouteComponent(
  () => import("@/features/auth/login"),
  "Login",
);
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: (s: Record<string, unknown>): { error?: string } =>
    typeof s.error === "string" ? { error: s.error } : {},
  component: function LoginPage() {
    return <LoginScreen error={login.useSearch().error} />;
  },
});
const privacy = createRoute({
  getParentRoute: () => root,
  path: "/privacidad",
  component: lazyRouteComponent(
    () => import("@/features/legal/legal"),
    "Privacy",
  ),
});
const terms = createRoute({
  getParentRoute: () => root,
  path: "/terminos",
  component: lazyRouteComponent(
    () => import("@/features/legal/legal"),
    "Terms",
  ),
});
const shell = createRoute({
  getParentRoute: () => root,
  id: "shell",
  component: Shell,
  notFoundComponent: NotFound,
});

const home = createRoute({
  getParentRoute: () => shell,
  path: "/",
  validateSearch: parseMyWorkSearch,
  component: lazyRouteComponent(
    () => import("@/features/tasks/my-work"),
    "MyWork",
  ),
});
const inbox = createRoute({
  getParentRoute: () => shell,
  path: "/inbox",
  component: lazyRouteComponent(
    () => import("@/features/inbox/inbox-page"),
    "InboxPage",
  ),
});
const calendar = createRoute({
  getParentRoute: () => shell,
  path: "/calendar",
  validateSearch: (s: Record<string, unknown>) =>
    parseCalendarSearch(s, today()),
  component: lazyRouteComponent(
    () => import("@/features/calendar/calendar-page"),
    "CalendarPage",
  ),
});
const overview = createRoute({
  getParentRoute: () => shell,
  path: "/overview",
  component: lazyRouteComponent(
    () => import("@/features/overview/overview-page"),
    "OverviewPage",
  ),
});
const profile = createRoute({
  getParentRoute: () => shell,
  path: "/perfil",
  component: lazyRouteComponent(
    () => import("@/features/profile/profile-page"),
    "ProfilePage",
  ),
});
const TeamScreen = lazyRouteComponent(
  () => import("@/features/teams/team-page"),
  "TeamPage",
);
const team = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team",
  validateSearch: parseTeamSearch,
  component: function Team() {
    return <TeamScreen team={team.useParams().team} />;
  },
});
const newTeam = createRoute({
  getParentRoute: () => shell,
  path: "/teams/new",
  component: lazyRouteComponent(
    () => import("@/features/settings/new-team"),
    "NewTeam",
  ),
});
const SettingsScreen = lazyRouteComponent(
  () => import("@/features/settings/team-settings"),
  "TeamSettings",
);
const settings = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team/settings",
  component: function Settings() {
    return <SettingsScreen team={settings.useParams().team} />;
  },
});
const TaskScreen = lazyRouteComponent(
  () => import("@/features/tasks/task-page"),
  "TaskPage",
);
const task = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team/$number",
  component: function TaskRoute() {
    const { team: k, number } = task.useParams();
    return <TaskScreen team={k} number={number} />;
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
      profile,
      newTeam,
      team,
      settings,
      task,
    ]),
  ]),
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
