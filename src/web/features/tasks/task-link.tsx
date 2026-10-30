import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import type { Task } from "@shared/types";
import { useOpenTask } from "./hooks";

// Plain clicks use `useOpenTask`; other clicks preserve normal link behavior.
export function TaskLink({
  task,
  onClick,
  ...props
}: { task: Pick<Task, "key" | "team" | "number"> } & Omit<
  ComponentProps<"a">,
  "href"
>) {
  const open = useOpenTask();
  return (
    <Link
      to="/t/$team/$number"
      params={{ team: task.team, number: String(task.number) }}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        open(task);
      }}
      {...props}
    />
  );
}
