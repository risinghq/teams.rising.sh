import { useState } from "react";
import type { Update } from "@shared/types";
import { relativeTime } from "@/lib/dates";
import { STATUS_LABEL, type TaskStatus } from "@/lib/domain";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { useComment } from "./hooks";

function describe(u: Update): string {
  const m = u.meta as { from?: unknown; to?: unknown };
  const name = (v: unknown) =>
    v === null || v === undefined || v === "" ? "ninguno" : String(v);
  const status = (v: unknown) => STATUS_LABEL[v as TaskStatus] ?? name(v);
  if (u.kind === "status")
    return `cambió el estado de ${status(m.from)} a ${status(m.to)}`;
  if (u.kind === "owner") return "cambió el responsable";
  if (u.kind === "due") return `cambió la fecha de entrega a ${name(m.to)}`;
  return u.body;
}

export function TaskActivity({
  taskKey,
  updates,
}: {
  taskKey: string;
  updates: Update[];
}) {
  const [text, setText] = useState("");
  const comment = useComment();
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    comment.mutate({ key: taskKey, body }, { onSuccess: () => setText("") });
  };
  return (
    <section className="px-6 py-4">
      <h3 className="mb-2 text-xs font-medium">Actividad</h3>
      <ul className="space-y-3">
        {updates.map((u) => (
          <li key={u.id} className="flex gap-2">
            <PersonAvatar
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
                  {u.author_name ?? "Sistema"}
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
        <Textarea
          aria-label="Comentar"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Escribe una actualización. Usa @nombre para avisar a alguien."
          rows={3}
        />
        <Button type="submit" className="self-end" disabled={comment.isPending}>
          Comentar
        </Button>
      </form>
    </section>
  );
}
