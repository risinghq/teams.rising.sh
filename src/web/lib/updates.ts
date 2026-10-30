import type { InboxItem, Update } from "@shared/types";
import { shortDay } from "./dates";
import { STATUS_LABEL, type TaskStatus } from "./domain";

type Described = Pick<Update, "kind" | "body" | "meta" | "author_id">;

// What an update says after its author's name: "asignó la tarea a Caro Díaz".
// `me` turns the caller into "te", as in "te agregó".
export function describeUpdate(
  u: Described,
  nameOf: (userId: string) => string,
  me?: string,
): string {
  const m = u.meta as Record<string, string | null | undefined>;
  const status = (v: string | null | undefined) =>
    STATUS_LABEL[v as TaskStatus] ?? v ?? "ninguno";
  switch (u.kind) {
    case "status":
      return `cambió el estado de ${status(m.from)} a ${status(m.to)}`;
    case "owner":
      if (!m.to) return "quitó al responsable";
      if (m.to === me) return "te asignó la tarea";
      return `asignó la tarea a ${nameOf(m.to)}`;
    case "due":
      if (!m.to) return "quitó la fecha de entrega";
      return `cambió la entrega al ${shortDay(m.to)}`;
    case "collaborator": {
      const added = m.added;
      const target = added ?? m.removed ?? "";
      if (target === u.author_id) return added ? "se unió" : "dejó la tarea";
      if (target === me) return added ? "te agregó" : "te quitó de la tarea";
      return `${added ? "agregó a" : "quitó a"} ${nameOf(target)}`;
    }
    default:
      return u.body;
  }
}

export type InboxThread = {
  task_key: string;
  task_title: string;
  latest: InboxItem;
  unread: number;
  mentioned: boolean;
};

// One row per task, newest activity first. `mentioned` holds only for an
// unread mention, so a read one stops drawing attention.
export function groupInbox(items: InboxItem[]): InboxThread[] {
  const threads = new Map<string, InboxThread>();
  for (const i of items) {
    const t = threads.get(i.task_key) ?? {
      task_key: i.task_key,
      task_title: i.task_title,
      latest: i,
      unread: 0,
      mentioned: false,
    };
    if (i.created_at > t.latest.created_at) t.latest = i;
    if (i.unread) t.unread += 1;
    if (i.unread && i.mentioned) t.mentioned = true;
    threads.set(i.task_key, t);
  }
  return [...threads.values()].sort((a, b) =>
    b.latest.created_at.localeCompare(a.latest.created_at),
  );
}
