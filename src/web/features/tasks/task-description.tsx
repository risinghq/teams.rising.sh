import { Pencil, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { MarkdownField, MarkdownTextarea } from "./format-bar";
import { Markdown } from "./markdown";

// A task's description: shown formatted, written in place. Someone who cannot
// edit the task sees it only, and nothing when it is empty.
export function TaskDescription({
  text,
  canEdit,
  onSave,
}: {
  text: string;
  canEdit: boolean;
  onSave: (description: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const save = () => {
    if (draft === null) return;
    if (draft.trim() !== text.trim()) onSave(draft.trim());
    setDraft(null);
  };

  if (draft !== null)
    return (
      <form
        className="flex flex-col gap-2 border-b px-6 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(null);
          }
        }}
      >
        <MarkdownField target={box} value={draft} onChange={setDraft}>
          <MarkdownTextarea
            ref={box}
            // Opened by a click on "Agregar" or "Editar", so the keyboard is
            // wanted even on a phone.
            autoFocus
            aria-label="Descripción de la tarea"
            value={draft}
            onChange={setDraft}
            onSubmit={save}
            placeholder="Qué hay que hacer, con enlaces al paper, repo o datos"
            rows={5}
          />
        </MarkdownField>
        <div className="flex flex-wrap items-center gap-2">
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              Guardar
            </Button>
          </div>
        </div>
      </form>
    );

  if (!text)
    return canEdit ? (
      <div className="border-b px-6 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft("")}
          className="-ml-2 px-2 font-normal text-muted-foreground"
        >
          <Plus /> Agregar descripción
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex items-start gap-2 border-b px-6 py-4 text-sm">
      <div className="min-w-0 flex-1">
        <Markdown text={text} onToggle={canEdit ? onSave : undefined} />
      </div>
      {canEdit && (
        <IconButton
          label="Editar descripción"
          size="icon-xs"
          className="-mt-1 text-muted-foreground"
          onClick={() => setDraft(text)}
        >
          <Pencil />
        </IconButton>
      )}
    </div>
  );
}
