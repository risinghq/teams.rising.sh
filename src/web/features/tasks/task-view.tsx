import { Link } from "@tanstack/react-router";
import { ExternalLink, Lock, Maximize2, X } from "lucide-react";
import type { TaskDetail } from "@shared/types";
import { today } from "@/lib/dates";
import {
  LINK_STATE_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUSES,
  type TaskStatus,
} from "@/lib/domain";
import { useProjects } from "@/features/projects/hooks";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useMe, useTeams, useUsers } from "@/features/teams/hooks";
import { Button, buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { IconButton } from "@/ui/icon-button";
import { Input } from "@/ui/input";
import { ProgressBar } from "@/ui/progress-bar";
import { Select } from "@/ui/select";
import { SkeletonRows } from "@/ui/skeleton";
import { StatusDot } from "@/ui/status-dot";
import { DueChip } from "./due-chip";
import {
  useJoinTask,
  useLeaveTask,
  usePatchTask,
  useTask,
  useTeamLabels,
} from "./hooks";
import { LinkedText } from "./linked-text";
import { TaskActivity } from "./task-activity";

// A task's fields, subtasks, links and activity. `onClose` marks the side
// panel, which adds a link to the task's own page; without it the view is that
// page and its title is the page's `h1`.
export function TaskView({
  taskKey,
  onClose,
}: {
  taskKey: string;
  onClose?: () => void;
}) {
  const q = useTask(taskKey);
  if (q.isPending) return <SkeletonRows rows={4} />;
  if (q.isError)
    return (
      <EmptyState
        title="Tarea no encontrada"
        as={onClose ? "p" : "h1"}
        action={
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        }
      >
        Puede ser privada o haber sido borrada.
      </EmptyState>
    );
  return <Detail task={q.data} onClose={onClose} />;
}

function Detail({ task, onClose }: { task: TaskDetail; onClose?: () => void }) {
  const Title = onClose ? "h2" : "h1";
  const me = useMe();
  const users = useUsers();
  const projects = useProjects(task.team);
  const teamId = useTeams().data?.find((t) => t.key === task.team)?.id;
  const labels = useTeamLabels(teamId);
  const patch = usePatchTask();
  const join = useJoinTask();
  const leave = useLeaveTask();
  const set = (p: Record<string, unknown>) =>
    patch.mutate({ key: task.key, parentId: task.parent_id, patch: p });
  const joined = task.collaborators.some((c) => c.id === me.data?.id);

  return (
    <article className="flex flex-col">
      <header className="flex items-start gap-3 px-6 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {task.key}
            {task.visibility === "private" && (
              <Lock size={12} aria-label="Privada" />
            )}
          </p>
          <Title className="mt-1 text-xl font-semibold">{task.title}</Title>
        </div>
        {onClose && (
          <>
            <Button
              asChild
              variant="ghost"
              size="icon-xs"
              aria-label="Abrir en una página"
            >
              <Link
                to="/t/$team/$number"
                params={{ team: task.team, number: String(task.number) }}
              >
                <Maximize2 />
              </Link>
            </Button>
            <IconButton label="Cerrar" size="icon-xs" onClick={onClose}>
              <X />
            </IconButton>
          </>
        )}
      </header>

      <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-3 border-y px-6 py-4 text-xs">
        <dt className="text-muted-foreground">Estado</dt>
        <dd className="flex items-center gap-2">
          <StatusDot status={task.status} />
          <Select
            aria-label="Estado"
            size="sm"
            className="w-auto"
            value={task.status}
            onChange={(e) => set({ status: e.target.value as TaskStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </dd>
        <dt className="text-muted-foreground">Responsable</dt>
        <dd className="flex items-center gap-2">
          <PersonAvatar person={task.owner} />
          <Select
            aria-label="Responsable"
            size="sm"
            className="w-auto"
            value={task.owner?.id ?? ""}
            onChange={(e) => set({ owner_id: e.target.value || null })}
          >
            <option value="">Sin asignar</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </dd>
        <dt className="text-muted-foreground">Entrega</dt>
        <dd className="flex items-center gap-2">
          <Input
            type="date"
            size="sm"
            className="w-auto"
            aria-label="Fecha de entrega"
            value={task.due_date ?? ""}
            onChange={(e) => set({ due_date: e.target.value || null })}
          />
          <DueChip task={task} today={today()} />
        </dd>
        <dt className="text-muted-foreground">Prioridad</dt>
        <dd>
          <Select
            aria-label="Prioridad"
            size="sm"
            className="w-auto"
            value={task.priority}
            onChange={(e) => set({ priority: Number(e.target.value) })}
          >
            {PRIORITY_LABEL.map((p, i) => (
              <option key={p} value={i}>
                {p}
              </option>
            ))}
          </Select>
        </dd>
        <dt className="text-muted-foreground">Proyecto</dt>
        <dd>
          <Select
            aria-label="Proyecto"
            size="sm"
            className="w-auto"
            value={task.project_id ?? ""}
            onChange={(e) => set({ project_id: e.target.value || null })}
          >
            <option value="">Sin proyecto</option>
            {projects.data
              ?.filter((p) => p.status === "active" || p.id === task.project_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </dd>
        <dt className="text-muted-foreground">Etiquetas</dt>
        <dd className="flex flex-wrap gap-1">
          {labels?.map((l) => {
            const on = task.labels.some((x) => x.id === l.id);
            return (
              <Button
                key={l.id}
                variant="outline"
                size="sm"
                aria-pressed={on}
                onClick={() =>
                  set({
                    labels: on
                      ? task.labels
                          .filter((x) => x.id !== l.id)
                          .map((x) => x.id)
                      : [...task.labels.map((x) => x.id), l.id],
                  })
                }
                className={
                  on
                    ? "rounded-full border-transparent"
                    : "rounded-full border-dashed text-muted-foreground"
                }
                style={
                  on
                    ? {
                        background: `color-mix(in oklch, ${l.color} 16%, transparent)`,
                      }
                    : undefined
                }
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: l.color }}
                />
                {l.name}
              </Button>
            );
          })}
        </dd>
        <dt className="text-muted-foreground">Ayudan</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {task.collaborators.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <PersonAvatar person={c} /> {c.name}
            </span>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              joined
                ? leave.mutate({ key: task.key })
                : join.mutate({ key: task.key })
            }
          >
            {joined ? "Salir" : "Ayudar"}
          </Button>
        </dd>
      </dl>

      {task.description && (
        <p className="whitespace-pre-wrap border-b px-6 py-4 text-sm">
          <LinkedText text={task.description} />
        </p>
      )}

      {task.subtasks.length > 0 && (
        <section className="border-b px-6 py-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold">
            Subtareas <ProgressBar value={task.progress} />
          </h3>
          <ul className="space-y-1">
            {task.subtasks.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <StatusDot status={s.status} />
                <Link
                  to="/t/$team/$number"
                  params={{ team: s.team, number: String(s.number) }}
                  className="truncate hover:underline"
                >
                  {s.title}
                </Link>
                <span className="ml-auto">
                  <PersonAvatar person={s.owner} size={16} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {task.links.length > 0 && (
        <section className="border-b px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold">Trabajo enlazado</h3>
          <ul className="space-y-1">
            {task.links.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <ExternalLink size={12} />{" "}
                  {l.title || `${l.repo}#${l.external_id}`}
                  <span className="text-xs text-muted-foreground">
                    {LINK_STATE_LABEL[l.state] ?? l.state}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TaskActivity taskKey={task.key} updates={task.updates} />
    </article>
  );
}
