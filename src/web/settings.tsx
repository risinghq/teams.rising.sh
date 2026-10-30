import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api, type Member } from "./api";
import { useLabels, useMe, useTeam, useUsers, useWrite } from "./data";
import {
  Avatar,
  button,
  Empty,
  field,
  Header,
  LabelChip,
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
    return <Empty title="Solo un admin puede crear equipos" />;
  const valid = /^[A-Z][A-Z0-9]{1,5}$/.test(key) && name.trim() !== "";
  return (
    <div className="mx-auto max-w-xl">
      <Header title="Nuevo equipo" />
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
          Nombre
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
            Clave
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
            {`De 2 a 6 letras o números. Numera las tareas, como en ${key || "AIS"}-12, y las ramas la usan para enlazarse a una tarea.`}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Descripción
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
            Crear equipo
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
  if (q.isError) return <Empty title="Equipo no encontrado" />;
  const detail = q.data;
  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex min-h-12 items-center gap-2 border-b px-4 py-2">
        <Link
          to="/t/$team"
          params={{ team }}
          aria-label={`Volver a ${detail.name}`}
          className="-ml-2 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold">Ajustes de {detail.name}</h1>
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
    <Section title="Detalles">
      <form
        className="flex flex-col gap-2 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate({ name: name.trim(), description });
        }}
      >
        <input
          aria-label="Nombre del equipo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
        <textarea
          aria-label="Descripción del equipo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="En qué trabaja el equipo"
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
              Guardar
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
    <Section title={`Miembros ${members.length}`}>
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
              aria-label={`Rol de ${m.name}`}
              className={field}
              value={m.role}
              onChange={(e) =>
                set.mutate({
                  userId: m.id,
                  role: e.target.value as Member["role"],
                })
              }
            >
              <option value="leader">Líder</option>
              <option value="member">Miembro</option>
            </select>
            <button
              type="button"
              className={button}
              onClick={() => remove.mutate(m.id)}
            >
              Quitar
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
          aria-label="Persona a agregar"
          className={`${field} min-w-0 flex-1`}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
        >
          <option value="">Agregar a una persona…</option>
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
          Agregar
        </button>
      </form>
      <p className="px-4 pb-3 text-xs text-muted-foreground">
        Las personas aparecen aquí después de iniciar sesión por primera vez.
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
    <Section title="Etiquetas">
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {labels?.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Todavía no hay etiquetas.
          </span>
        )}
        {labels?.map((l) => (
          <span
            key={l.id}
            title={l.team_id ? undefined : "Compartida por todos los equipos"}
          >
            <LabelChip label={l} />
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
          aria-label="Color de la etiqueta"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border bg-background p-1"
        />
        <input
          aria-label="Nombre de la nueva etiqueta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva etiqueta, como paper o idea"
          maxLength={40}
          className={`${input} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className={primaryButton}
          disabled={!name.trim() || create.isPending}
        >
          Agregar
        </button>
      </form>
      <Failure error={create.error} />
    </Section>
  );
}
