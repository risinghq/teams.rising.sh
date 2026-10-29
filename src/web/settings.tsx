import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api, type Member } from "./api";
import { useLabels, useMe, useTeam, useUsers, useWrite } from "./data";
import { t } from "./i18n";
import {
  Avatar,
  button,
  Empty,
  field,
  Header,
  primaryButton,
  Skeleton,
} from "./ui";

const input = "h-9 rounded-md border bg-background px-2 text-sm";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b">
      <h2 className="border-b bg-sidebar px-4 py-1.5 text-xs font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Failure({ error }: { error: Error | null }) {
  return error ? (
    <p role="alert" className="px-4 pb-3 text-xs text-destructive">
      {error.message}
    </p>
  ) : null;
}

// Admins create teams. The creator becomes the first leader and lands on the
// new team's settings to add people.
export function NewTeam() {
  const me = useMe().data;
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useWrite((body: Record<string, unknown>) =>
    api.createTeam(body),
  );
  if (me && !me.is_admin)
    return <Empty title={t("Only an admin can create teams")} />;
  const valid = /^[A-Z][A-Z0-9]{1,5}$/.test(key) && name.trim() !== "";
  return (
    <div className="mx-auto max-w-xl">
      <Header title={t("New team")} />
      <form
        className="flex flex-col gap-3 px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || !me) return;
          create.mutate(
            { key, name: name.trim(), description, leaders: [me.id] },
            {
              onSuccess: () =>
                void navigate({
                  to: "/t/$team/settings",
                  params: { team: key },
                }),
            },
          );
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-medium">
          {t("Name")}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AI for Science"
            className={input}
          />
        </label>
        <div className="flex flex-col gap-1 text-xs">
          <label htmlFor="team-key" className="font-medium">
            {t("Key")}
          </label>
          <input
            id="team-key"
            aria-describedby="team-key-hint"
            value={key}
            onChange={(e) =>
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            maxLength={6}
            placeholder="AIS"
            className={`${input} w-28 uppercase`}
          />
          <p id="team-key-hint" className="text-muted-foreground">
            {t(
              "2 to 6 letters or digits. Tasks are numbered with it, as in {key}-12, and branch names use it to link to tasks.",
              { key: key || "AIS" },
            )}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium">
          {t("Description")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            className={primaryButton}
            disabled={!valid || create.isPending}
          >
            {t("Create team")}
          </button>
        </div>
      </form>
      <Failure error={create.error} />
    </div>
  );
}

// Members and labels of a team. The server lets only leaders and admins change
// them, so a member sees the page but the changes fail with a reason.
export function TeamSettings({ team }: { team: string }) {
  const q = useTeam(team);
  if (q.isPending) return <Skeleton rows={4} />;
  if (q.isError) return <Empty title={t("Team not found")} />;
  const detail = q.data;
  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex min-h-12 items-center gap-2 border-b px-4 py-2">
        <Link
          to="/t/$team"
          params={{ team }}
          aria-label={t("Back to {team}", { team: detail.name })}
          className="-ml-2 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold">
          {t("{team} settings", { team: detail.name })}
        </h1>
      </header>
      <Details
        team={team}
        name={detail.name}
        description={detail.description}
      />
      <Members team={team} members={detail.members} />
      <Labels teamId={detail.id} />
    </div>
  );
}

function Details({
  team,
  name: initialName,
  description: initialDescription,
}: {
  team: string;
  name: string;
  description: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const save = useWrite((body: Record<string, unknown>) =>
    api.patchTeam(team, body),
  );
  const changed = name !== initialName || description !== initialDescription;
  return (
    <Section title={t("Details")}>
      <form
        className="flex flex-col gap-2 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate({ name: name.trim(), description });
        }}
      >
        <input
          aria-label={t("Team name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
        <textarea
          aria-label={t("Team description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("What the team works on")}
          rows={2}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        />
        {changed && (
          <div className="flex justify-end">
            <button
              type="submit"
              className={primaryButton}
              disabled={save.isPending || !name.trim()}
            >
              {t("Save")}
            </button>
          </div>
        )}
      </form>
      <Failure error={save.error} />
    </Section>
  );
}

function Members({ team, members }: { team: string; members: Member[] }) {
  const users = useUsers();
  const [adding, setAdding] = useState("");
  const set = useWrite(
    ({ userId, role }: { userId: string; role: Member["role"] }) =>
      api.setMember(team, userId, role),
  );
  const remove = useWrite((userId: string) => api.removeMember(team, userId));
  const outside = users.data?.filter(
    (u) => u.kind === "human" && !members.some((m) => m.id === u.id),
  );
  return (
    <Section title={t("Members {n}", { n: members.length })}>
      <ul>
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 border-b px-4 py-2">
            <Avatar person={m} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{m.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {m.email}
              </span>
            </span>
            <select
              aria-label={t("Role of {name}", { name: m.name })}
              className={field}
              value={m.role}
              onChange={(e) =>
                set.mutate({
                  userId: m.id,
                  role: e.target.value as Member["role"],
                })
              }
            >
              <option value="leader">{t("Leader")}</option>
              <option value="member">{t("Member")}</option>
            </select>
            <button
              type="button"
              className={button}
              onClick={() => remove.mutate(m.id)}
            >
              {t("Remove")}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding) return;
          set.mutate(
            { userId: adding, role: "member" },
            { onSuccess: () => setAdding("") },
          );
        }}
      >
        <select
          aria-label={t("Person to add")}
          className={`${field} min-w-0 flex-1`}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
        >
          <option value="">{t("Add a person…")}</option>
          {outside?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.email}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={primaryButton}
          disabled={!adding || set.isPending}
        >
          {t("Add")}
        </button>
      </form>
      <p className="px-4 pb-3 text-xs text-muted-foreground">
        {t("People show up here after they sign in for the first time.")}
      </p>
      <Failure error={set.error ?? remove.error} />
    </Section>
  );
}

function Labels({ teamId }: { teamId: string }) {
  const labels = useLabels().data?.filter(
    (l) => l.team_id === null || l.team_id === teamId,
  );
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const create = useWrite((body: Record<string, unknown>) =>
    api.createLabel(body),
  );
  return (
    <Section title={t("Labels")}>
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {labels?.length === 0 && (
          <span className="text-xs text-muted-foreground">
            {t("No labels yet.")}
          </span>
        )}
        {labels?.map((l) => (
          <span
            key={l.id}
            className="rounded-full border px-2.5 py-0.5 text-xs"
            style={{ borderColor: l.color }}
            title={l.team_id ? undefined : t("Shared by every team")}
          >
            {l.name}
          </span>
        ))}
      </div>
      <form
        className="flex items-center gap-2 px-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate(
            { team_id: teamId, name: name.trim(), color },
            { onSuccess: () => setName("") },
          );
        }}
      >
        <input
          type="color"
          aria-label={t("Label color")}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border bg-background p-1"
        />
        <input
          aria-label={t("New label name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("New label, such as paper or idea")}
          maxLength={40}
          className={`${input} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className={primaryButton}
          disabled={!name.trim() || create.isPending}
        >
          {t("Add")}
        </button>
      </form>
      <Failure error={create.error} />
    </Section>
  );
}
