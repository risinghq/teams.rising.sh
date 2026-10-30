import { Link } from "@tanstack/react-router";
import { ExternalLink, Lock, Maximize2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { TaskDetail } from "@shared/types";
import { today } from "@/lib/dates";
import {
  LINK_STATE_LABEL,
  STATUS_LABEL,
  STATUSES,
  type TaskStatus,
} from "@/lib/domain";
import { useReadTaskOnOpen } from "@/features/inbox/hooks";
import { useProjects } from "@/features/projects/hooks";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useTeams, useUsers } from "@/features/teams/hooks";
import { Button, buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { IconButton } from "@/ui/icon-button";
import { Input } from "@/ui/input";
import { ProgressBar } from "@/ui/progress-bar";
import { SkeletonRows } from "@/ui/skeleton";
import { StatusDot } from "@/ui/status-dot";
import { DueChip } from "./due-chip";
import { FieldMenu } from "./field-menu";
import { usePatchTask, useTask, useTeamLabels } from "./hooks";
import { ImagePreviews, LinkedText } from "./linked-text";
import { TaskActivity } from "./task-activity";
import { TaskCollaborators } from "./task-collaborators";

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex h-8 items-center text-muted-foreground">{label}</dt>
      <dd className="flex min-h-8 min-w-0 flex-wrap items-center gap-2">
        {children}
      </dd>
    </>
  );
}

function Detail({ task, onClose }: { task: TaskDetail; onClose?: () => void }) {
  const Title = onClose ? "h2" : "h1";
  const users = useUsers();
  const projects = useProjects(task.team);
  const teamId = useTeams().data?.find((t) => t.key === task.team)?.id;
  const labels = useTeamLabels(teamId);
  const patch = usePatchTask();
  const set = (p: Record<string, unknown>) =>
    patch.mutate({ key: task.key, parentId: task.parent_id, patch: p });
  useReadTaskOnOpen(task.key);

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

      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 border-y px-6 py-4 text-xs">
        <Field label="Estado">
          <FieldMenu
            label="Estado"
            value={task.status}
            onChange={(v) => set({ status: v as TaskStatus })}
            options={STATUSES.map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
              lead: <StatusDot status={s} />,
            }))}
          />
        </Field>
        <Field label="Responsable">
          <FieldMenu
            label="Responsable"
            value={task.owner?.id ?? ""}
            onChange={(v) => set({ owner_id: v || null })}
            options={[
              {
                value: "",
                label: "Sin asignar",
                lead: <PersonAvatar person={null} size={18} />,
              },
              ...(users.data ?? []).map((u) => ({
                value: u.id,
                label: u.name,
                lead: <PersonAvatar person={u} size={18} />,
              })),
            ]}
          />
        </Field>
        <Field label="Colaboran">
          <TaskCollaborators task={task} />
        </Field>
        <Field label="Entrega">
          <Input
            type="date"
            size="sm"
            appearance="bare"
            className="-ml-2 w-auto px-2 hover:bg-accent"
            aria-label="Fecha de entrega"
            value={task.due_date ?? ""}
            onChange={(e) => set({ due_date: e.target.value || null })}
          />
          <DueChip task={task} today={today()} />
        </Field>
        <Field label="Proyecto">
          <FieldMenu
            label="Proyecto"
            value={task.project_id ?? ""}
            onChange={(v) => set({ project_id: v || null })}
            options={[
              { value: "", label: "Sin proyecto" },
              ...(projects.data ?? [])
                .filter(
                  (p) => p.status === "active" || p.id === task.project_id,
                )
                .map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </Field>
        <Field label="Etiquetas">
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
        </Field>
      </dl>

      {task.description && (
        <p className="whitespace-pre-wrap border-b px-6 py-4 text-sm">
          <LinkedText text={task.description} />
          <ImagePreviews text={task.description} />
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
