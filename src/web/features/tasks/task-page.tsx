import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TaskView } from "./task-view";

// This route supports narrow screens, new tabs, and shared links. Wide screens
// render the same view in a list's side panel.
export function TaskPage({ team, number }: { team: string; number: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl pb-24">
      <Link
        to="/t/$team"
        params={{ team }}
        className="mx-6 mt-6 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft size={14} aria-hidden /> Volver a {team}
      </Link>
      <TaskView taskKey={`${team}-${number}`} />
    </div>
  );
}
