import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { FreeBusy, Person } from "@shared/types";
import { cn } from "@/lib/cn";
import { today } from "@/lib/dates";
import { finePointer } from "@/lib/device";
import { freeStarts, overlaps, steps, STEP_MIN } from "@/lib/slots";
import { FieldMenu } from "@/features/tasks/field-menu";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { TeamMark } from "@/features/teams/team-mark";
import { useMe, useUsers } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { FormError } from "@/ui/form-error";
import { Input } from "@/ui/input";
import { useCreateEvent, useFreeBusy } from "./hooks";

const DURATIONS = [30, 45, 60, 90, 120];
const NO_TEAM = "";
const SUGGESTIONS = 4;

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function EventDialog({
  open,
  onOpenChange,
  date: initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>Nuevo evento</DialogTitle>
        <DialogDescription>
          Invita a tu equipo y elige una hora en la que todos estén libres.
        </DialogDescription>
        {/* Mounted only while open, so each opening starts blank. */}
        {open && (
          <EventForm date={initialDate} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  date: initialDate,
  onDone,
}: {
  date: string;
  onDone: () => void;
}) {
  const me = useMe().data;
  const users = useUsers().data ?? [];
  const create = useCreateEvent();
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState(NO_TEAM);
  const [date, setDate] = useState(
    initialDate < today() ? today() : initialDate,
  );
  const [time, setTime] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [invited, setInvited] = useState<Person[]>([]);
  const [meet, setMeet] = useState(true);

  const people = me ? [me.id, ...invited.map((p) => p.id)] : [];
  const busy = useFreeBusy(people, date).data;
  const suggestions = busy
    ? freeStarts(
        people.map((id) => busy[id]?.busy ?? []),
        date,
        minutes,
      ).slice(0, SUGGESTIONS)
    : [];
  const myGoogle = busy?.[me?.id ?? ""]?.google ?? false;
  const candidates = users.filter(
    (u) => u.id !== me?.id && !invited.some((p) => p.id === u.id),
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const name = title.trim();
        if (!name || !time) return;
        const start = new Date(`${date}T${time}`);
        create.mutate(
          {
            title: name,
            team: team || null,
            starts_at: start.toISOString(),
            ends_at: new Date(start.getTime() + minutes * 60_000).toISOString(),
            attendees: invited.map((p) => p.id),
            meet: meet && myGoogle,
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Input
        aria-label="Título del evento"
        autoFocus={finePointer()}
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          aria-label="Fecha"
          value={date}
          min={today()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-auto"
        />
        <Input
          type="time"
          aria-label="Hora"
          step={STEP_MIN * 60}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-auto"
        />
        <FieldMenu
          label="Duración"
          value={String(minutes)}
          onChange={(v) => setMinutes(Number(v))}
          chevron="always"
          options={DURATIONS.map((m) => ({
            value: String(m),
            label: m < 60 ? `${m} min` : `${m / 60} h`.replace(".5", ",5"),
          }))}
        />
        <FieldMenu
          label="Equipo"
          value={team}
          onChange={setTeam}
          chevron="always"
          className="text-muted-foreground"
          options={[
            { value: NO_TEAM, label: "Sin equipo" },
            ...(me?.teams ?? []).map((t) => ({
              value: t.key,
              label: t.name,
              lead: <TeamMark teamKey={t.key} size={16} />,
            })),
          ]}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
        <span className="mr-1 text-muted-foreground">Invitados</span>
        {invited.map((p) => (
          <span
            key={p.id}
            className="flex h-7 items-center gap-1.5 rounded-full border pr-1 pl-1"
          >
            <PersonAvatar person={p} size={18} />
            {p.name}
            <button
              type="button"
              aria-label={`Quitar a ${p.name}`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setInvited(invited.filter((x) => x.id !== p.id))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {candidates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Invitar a alguien"
                className="px-2 font-normal text-muted-foreground"
              >
                <Plus /> Invitar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 min-w-48">
              {candidates.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onSelect={() => setInvited([...invited, u])}
                >
                  <PersonAvatar person={u} size={18} />
                  {u.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {me && busy && (
        <BusyGrid
          rows={[
            { id: me.id, name: "Tú", avatar_url: me.avatar_url },
            ...invited,
          ]}
          busy={busy}
          date={date}
          time={time}
          minutes={minutes}
          onPick={setTime}
        />
      )}

      {busy && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1 text-muted-foreground">Todos libres</span>
          {suggestions.length === 0 ? (
            <span className="text-muted-foreground">
              ningún horario este día
            </span>
          ) : (
            suggestions.map((s) => (
              <Button
                key={s.getTime()}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={hhmm(s) === time}
                className="aria-pressed:border-primary aria-pressed:text-primary"
                onClick={() => setTime(hhmm(s))}
              >
                {hhmm(s)}
              </Button>
            ))
          )}
        </div>
      )}

      <label
        className={cn(
          "flex items-center gap-2 text-sm",
          !myGoogle && "text-muted-foreground",
        )}
      >
        <input
          type="checkbox"
          checked={meet && myGoogle}
          disabled={!myGoogle}
          onChange={(e) => setMeet(e.target.checked)}
          className="size-4 accent-primary"
        />
        Crear enlace de Google Meet
        {!myGoogle && busy && (
          <span className="text-xs">(inicia sesión con Google)</span>
        )}
      </label>

      <DialogFooter className="items-center">
        <FormError error={create.error} className="sm:mr-auto" />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || !time || create.isPending}
        >
          Crear evento
        </Button>
      </DialogFooter>
    </form>
  );
}

// One row per person, one cell per step of the working day. A shaded cell is
// busy, a faded one has passed; the outline marks the chosen slot. Clicking a
// cell picks its start.
function BusyGrid({
  rows,
  busy,
  date,
  time,
  minutes,
  onPick,
}: {
  rows: Person[];
  busy: FreeBusy;
  date: string;
  time: string;
  minutes: number;
  onPick: (time: string) => void;
}) {
  const cells = steps(date);
  const now = Date.now();
  const start = time ? new Date(`${date}T${time}`).getTime() : null;
  const chosen = (cell: Date) =>
    start !== null &&
    cell.getTime() >= start &&
    cell.getTime() < start + minutes * 60_000;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="w-28" />
            {cells.map((c) => (
              <th
                key={c.getTime()}
                className="min-w-5 text-left font-normal text-muted-foreground"
              >
                {c.getMinutes() === 0 ? c.getHours() : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const own = busy[p.id];
            return (
              <tr key={p.id}>
                <th className="truncate pr-2 text-left font-normal">
                  <span className="flex items-center gap-1.5">
                    <PersonAvatar person={p} size={16} />
                    <span className="truncate">{p.name}</span>
                    {own && !own.google && (
                      <span
                        className="text-muted-foreground"
                        title="Sin Google: solo cuenta sus eventos en Teams"
                      >
                        *
                      </span>
                    )}
                  </span>
                </th>
                {cells.map((c) => (
                  <td key={c.getTime()} className="p-0">
                    <button
                      type="button"
                      aria-label={`${p.name}, ${hhmm(c)}`}
                      disabled={c.getTime() < now}
                      onClick={() => onPick(hhmm(c))}
                      className={cn(
                        "block h-6 w-full rounded-sm disabled:opacity-30",
                        own && overlaps(own.busy, c, STEP_MIN)
                          ? "bg-foreground/65"
                          : "bg-muted/70 enabled:hover:bg-primary/25",
                        chosen(c) && "ring-2 ring-primary",
                      )}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.some((p) => busy[p.id] && !busy[p.id]?.google) && (
        <p className="mt-1 text-xs text-muted-foreground">
          * Sin Google conectado: solo se ven sus eventos en Teams.
        </p>
      )}
    </div>
  );
}
