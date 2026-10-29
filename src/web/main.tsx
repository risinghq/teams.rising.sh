import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useNavigate,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError } from "./api";
import { Calendar, Inbox, Login, Overview } from "./pages";
import { NewTeam, TeamSettings } from "./settings";
import { Shell } from "./shell";
import { TaskView } from "./task";
import { MyWork, TeamPage } from "./team";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 10_000 } },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401)
        window.location.assign("/login");
    },
  }),
});

const taskSearch = (s: Record<string, unknown>): { task?: string } =>
  typeof s.task === "string" ? { task: s.task } : {};

const root = createRootRoute({ component: Outlet });
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  component: Login,
});
const shell = createRoute({
  getParentRoute: () => root,
  id: "shell",
  component: Shell,
});

const home = createRoute({
  getParentRoute: () => shell,
  path: "/",
  validateSearch: taskSearch,
  component: MyWork,
});
const inbox = createRoute({
  getParentRoute: () => shell,
  path: "/inbox",
  component: Inbox,
});
const calendar = createRoute({
  getParentRoute: () => shell,
  path: "/calendar",
  validateSearch: taskSearch,
  component: Calendar,
});
const overview = createRoute({
  getParentRoute: () => shell,
  path: "/overview",
  component: Overview,
});
const team = createRoute({
  getParentRoute: () => shell,
  path: "/t/$team",
  validateSearch: taskSearch,
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

const router = createRouter({
  routeTree: root.addChildren([
    login,
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

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
