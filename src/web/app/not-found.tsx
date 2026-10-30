import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";

export function NotFound() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <EmptyState
        as="h1"
        title="Página no encontrada"
        action={
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        }
      >
        La dirección no existe o ya no está disponible.
      </EmptyState>
    </div>
  );
}
