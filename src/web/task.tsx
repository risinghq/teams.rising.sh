import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { ExternalLink, Lock, X } from "lucide-react";
import { useState } from "react";
import {
  api,
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUSES,
  type TaskDetail,
  type TaskStatus,
  type Update,
} from "./api";
import {
  today,
  useLabels,
  useMe,
  usePatchTask,
  useProjects,
  useTask,
  useTeams,
  useUsers,
  useWrite,
} from "./data";
import { t } from "./i18n";
import { relativeTime } from "./lib";
import {
  Avatar,
  button,
  DueChip,
  Empty,
  field,
  LinkedText,
  primaryButton,
  ProgressBar,
  Skeleton,
  StatusDot,
} from "./ui";

export function TaskView({
  taskKey,
  onClose,
}: {
  taskKey: string;
  onClose?: () => void;
}) {
  const q = useTask(taskKey);
  if (q.isPending) return <Skeleton rows={4} />;
  if (q.isError)
    return (
      <Empty title={t("Task not found")}>
        {t("It may be private or deleted.")}
      </Empty>
    );
  return <Detail task={q.data} onClose={onClose} />;
}

function Detail({ task, onClose }: { task: TaskDetail; onClose?: () => void }) {
  const me = useMe();
  const users = useUsers();
  const projects = useProjects(task.team);
  const teamId = useTeams().data?.find((t) => t.key === task.team)?.id;
  const labels = useLabels().data?.filter(
    (l) => l.team_id === null || l.team_id === teamId,
  );
  const patch = usePatchTask();
  const join = useWrite(() => api.join(task.key));
  const leave = useWrite(() => api.leave(task.key));
  const set = (p: Record<string, unknown>) =>
    patch.mutate({ key: task.key, patch: p });
  const joined = task.collaborators.some((c) => c.id === me.data?.id);

  return (
    <article className="flex flex-col">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {task.key}
            {task.visibility === "private" && (
              <Lock size={12} aria-label={t("Private")} />
            )}
          </p>
          <h2 className="text-base font-semibold">{task.title}</h2>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label={t("Close")}
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
          >
            <X size={16} />
          </button>
        )}
      </header>

      <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2 border-b px-4 py-3 text-xs">
        <dt className="text-muted-foreground">{t("Status")}</dt>
        <dd className="flex items-center gap-2">
          <StatusDot status={task.status} />
          <select
            aria-label={t("Status")}
            className={field}
            value={task.status}
            onChange={(e) => set({ status: e.target.value as TaskStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </dd>
        <dt className="text-muted-foreground">{t("Owner")}</dt>
        <dd className="flex items-center gap-2">
          <Avatar person={task.owner} />
          <select
            aria-label={t("Owner")}
            className={field}
            value={task.owner?.id ?? ""}
            onChange={(e) => set({ owner_id: e.target.value || null })}
          >
            <option value="">{t("Unassigned")}</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </dd>
        <dt className="text-muted-foreground">{t("Due")}</dt>
        <dd className="flex items-center gap-2">
          <input
            type="date"
            aria-label={t("Due date")}
            className={field}
            value={task.due_date ?? ""}
            onChange={(e) => set({ due_date: e.target.value || null })}
          />
          <DueChip task={task} today={today()} />
        </dd>
        <dt className="text-muted-foreground">{t("Priority")}</dt>
        <dd>
          <select
            aria-label={t("Priority")}
            className={field}
            value={task.priority}
            onChange={(e) => set({ priority: Number(e.target.value) })}
          >
            {PRIORITY_LABEL.map((p, i) => (
              <option key={p} value={i}>
                {p}
              </option>
            ))}
          </select>
        </dd>
        <dt className="text-muted-foreground">{t("Project")}</dt>
        <dd>
          <select
            aria-label={t("Project")}
            className={field}
            value={task.project_id ?? ""}
            onChange={(e) => set({ project_id: e.target.value || null })}
          >
            <option value="">{t("No project")}</option>
            {projects.data
              ?.filter((p) => p.status === "active" || p.id === task.project_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </dd>
        <dt className="text-muted-foreground">{t("Labels")}</dt>
        <dd className="flex flex-wrap gap-1">
          {labels?.map((l) => {
            const on = task.labels.some((x) => x.id === l.id);
            return (
              <button
                key={l.id}
                type="button"
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
                className={clsx(
                  "h-8 rounded-full border px-3",
                  on ? "bg-muted" : "border-dashed text-muted-foreground",
                )}
                style={on ? { borderColor: l.color } : undefined}
              >
                {l.name}
              </button>
            );
          })}
        </dd>
        <dt className="text-muted-foreground">{t("Helping")}</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {task.collaborators.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <Avatar person={c} /> {c.name}
            </span>
          ))}
          <button
            type="button"
            className={button}
            onClick={() =>
              joined ? leave.mutate(undefined) : join.mutate(undefined)
            }
          >
            {joined ? t("Leave") : t("Help out")}
          </button>
        </dd>
      </dl>

      {task.description && (
        <p className="whitespace-pre-wrap border-b px-4 py-3 text-sm">
          <LinkedText text={task.description} />
        </p>
      )}

      {task.subtasks.length > 0 && (
        <section className="border-b px-4 py-3">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium">
            {t("Subtasks")} <ProgressBar value={task.progress} />
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
                  <Avatar person={s.owner} size={16} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {task.links.length > 0 && (
        <section className="border-b px-4 py-3">
          <h3 className="mb-2 text-xs font-medium">{t("Linked work")}</h3>
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
                    {t(l.state)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Activity taskKey={task.key} updates={task.updates} />
    </article>
  );
}

function describe(u: Update): string {
  const m = u.meta as { from?: unknown; to?: unknown };
  const name = (v: unknown) =>
    v === null || v === undefined || v === "" ? t("none") : String(v);
  const status = (v: unknown) => STATUS_LABEL[v as TaskStatus] ?? name(v);
  if (u.kind === "status")
    return t("changed status from {from} to {to}", {
      from: status(m.from),
      to: status(m.to),
    });
  if (u.kind === "owner") return t("changed the owner");
  if (u.kind === "due")
    return t("changed the due date to {to}", { to: name(m.to) });
  return u.body;
}

function Activity({
  taskKey,
  updates,
}: {
  taskKey: string;
  updates: Update[];
}) {
  const [text, setText] = useState("");
  const comment = useWrite((body: string) => api.comment(taskKey, body));
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    comment.mutate(body, { onSuccess: () => setText("") });
  };
  return (
    <section className="px-4 py-3">
      <h3 className="mb-2 text-xs font-medium">{t("Activity")}</h3>
      <ul className="space-y-3">
        {updates.map((u) => (
          <li key={u.id} className="flex gap-2">
            <Avatar
              person={
                u.author_id
                  ? {
                      id: u.author_id,
                      name: u.author_name ?? "?",
                      avatar_url: u.author_avatar,
                    }
                  : null
              }
            />
            <div className="min-w-0 text-xs">
              <p>
                <span className="font-medium">
                  {u.author_name ?? t("System")}
                </span>{" "}
                <span className="text-muted-foreground">
                  {relativeTime(u.created_at)}
                </span>
              </p>
              <p
                className={
                  u.kind === "comment"
                    ? "whitespace-pre-wrap text-sm"
                    : "text-muted-foreground"
                }
              >
                {describe(u)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          aria-label={t("Comment")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={t("Write an update. Use @name to notify someone.")}
          rows={3}
          className="rounded-md border bg-background p-2 text-sm"
        />
        <button
          type="submit"
          className={`${primaryButton} self-end`}
          disabled={comment.isPending}
        >
          {t("Comment")}
        </button>
      </form>
    </section>
  );
}
