import { useMutation } from "@tanstack/react-query";
import { UPLOAD_TYPES } from "@shared/schemas";
import { type ReactNode, useRef } from "react";
import { api } from "@/api";
import { Button } from "@/ui/button";

const ACCEPT = Object.keys(UPLOAD_TYPES).join(",");

// An upload changes no query: the caller saves the returned URL itself.
export const useUpload = () => useMutation({ mutationFn: api.upload });

// A picture with buttons to replace or remove it. A GIF stays animated.
export function ImagePicker({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  const busy = disabled || upload.isPending;
  return (
    <div className="flex items-center gap-4">
      {children}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        aria-label={label}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file)
            upload.mutate(file, { onSuccess: ({ url }) => onChange(url) });
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {upload.isPending ? "Subiendo…" : "Subir imagen"}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled={busy}
          onClick={() => onChange(null)}
        >
          Quitar
        </Button>
      )}
    </div>
  );
}
