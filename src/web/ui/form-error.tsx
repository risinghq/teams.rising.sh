import { cn } from "@/lib/cn";

// Why a form's write failed, next to its button. It stays until the next try,
// and `role="alert"` reads it out once when it appears.
function FormError({
  error,
  className,
}: {
  error: Error | null;
  className?: string;
}) {
  if (!error) return null;
  return (
    <p role="alert" className={cn("text-xs text-destructive", className)}>
      No se pudo guardar: {error.message}
    </p>
  );
}

export { FormError };
