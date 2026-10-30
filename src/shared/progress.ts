import type { TaskStatus } from "./types";

export type { TaskStatus };

export type ProgressInput = { status: TaskStatus };

/**
 * Progress of a task as a number from 0 to 1. A task with subtasks takes the
 * share of its done subtasks, ignoring canceled ones. A task without subtasks
 * is 1 when done, 0.5 when in progress and 0 otherwise.
 */
export function progress(
  task: ProgressInput,
  subtasks: ProgressInput[],
): number {
  const live = subtasks.filter((s) => s.status !== "canceled");
  if (live.length > 0) {
    return live.filter((s) => s.status === "done").length / live.length;
  }
  if (task.status === "done") return 1;
  if (task.status === "in_progress") return 0.5;
  return 0;
}
