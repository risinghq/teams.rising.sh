import { useState } from "react";
import type { Update } from "@shared/types";
import { relativeTime } from "@/lib/dates";
import { describeUpdate } from "@/lib/updates";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useMe, useNameOf } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import { useComment } from "./hooks";
import { ImagePreviews, LinkedText } from "./linked-text";
import { MentionTextarea } from "./mention-textarea";
import { ReactionList, ReactionMenu } from "./reactions";

export function TaskActivity({
  taskKey,
  updates,
}: {
  taskKey: string;
  updates: Update[];
}) {
  const [text, setText] = useState("");
  const comment = useComment();
  const nameOf = useNameOf();
  const me = useMe().data?.id;
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    comment.mutate({ key: taskKey, body }, { onSuccess: () => setText("") });
  };
  return (
    <section className="px-6 py-4">
      <h3 className="mb-4 text-xs font-semibold">Actividad</h3>
      <ul className="space-y-3">
        {updates.map((u) => (
          <li key={u.id} className="group flex gap-2">
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
            <div className="min-w-0 flex-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="font-medium">
                  {u.author_name ?? "Sistema"}
                </span>
                <span className="text-muted-foreground">
                  {relativeTime(u.created_at)}
                </span>
                <span className="-my-1 ml-auto">
                  <ReactionMenu taskKey={taskKey} update={u} />
                </span>
              </div>
              {u.kind === "comment" ? (
                <p className="whitespace-pre-wrap break-words text-sm">
                  <LinkedText text={u.body} />
                  <ImagePreviews text={u.body} />
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {describeUpdate(u, nameOf, me)}
                </p>
              )}
              <ReactionList taskKey={taskKey} update={u} />
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
        <MentionTextarea
          aria-label="Comentar"
          value={text}
          onChange={setText}
          onSubmit={submit}
          placeholder="Escribe una actualización. Escribe @ para avisar a alguien."
          rows={3}
        />
        <Button type="submit" className="self-end" disabled={comment.isPending}>
          Comentar
        </Button>
      </form>
    </section>
  );
}
