import { useState } from "react";
import { UPLOAD_TYPES } from "@shared/schemas";
import type { Update } from "@shared/types";
import { useUpload } from "@/features/files/image-picker";
import { relativeTime } from "@/lib/dates";
import { isPending } from "@/lib/optimistic";
import { describeUpdate } from "@/lib/updates";
import { PersonAvatar } from "@/features/teams/person-avatar";
import { useMe, useNameOf } from "@/features/teams/hooks";
import { Button } from "@/ui/button";
import { FormError } from "@/ui/form-error";
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
  const upload = useUpload();
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    // The comment shows in the list at once, so the box clears at once. A
    // failure puts the text back for another try.
    setText("");
    comment.mutate(
      { key: taskKey, body },
      { onError: () => setText((t) => t || body) },
    );
  };
  // A pasted or dropped image becomes a link on its own line. Comments render
  // only absolute image links as previews, so the link carries the origin.
  const attach = (files: FileList) => {
    const images = [...files].filter((f) => f.type in UPLOAD_TYPES);
    for (const file of images)
      upload.mutate(file, {
        onSuccess: ({ url }) =>
          setText((t) =>
            `${t.trimEnd()}\n${location.origin}${url}\n`.trimStart(),
          ),
      });
    return images.length > 0;
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
                  {isPending(u) ? "Enviando…" : relativeTime(u.created_at)}
                </span>
                {!isPending(u) && (
                  <span className="-my-1 ml-auto">
                    <ReactionMenu taskKey={taskKey} update={u} />
                  </span>
                )}
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
          onPaste={(e) => {
            if (attach(e.clipboardData.files)) e.preventDefault();
          }}
          onDrop={(e) => {
            if (attach(e.dataTransfer.files)) e.preventDefault();
          }}
          placeholder="Escribe una actualización. Escribe @ para avisar a alguien. Pega o suelta una imagen para adjuntarla."
          rows={3}
        />
        <div className="flex items-center justify-end gap-3">
          <FormError error={comment.error} className="mr-auto" />
          {upload.isPending && (
            <span className="text-xs text-muted-foreground">
              Subiendo imagen…
            </span>
          )}
          <Button type="submit" disabled={upload.isPending}>
            Comentar
          </Button>
        </div>
      </form>
    </section>
  );
}
