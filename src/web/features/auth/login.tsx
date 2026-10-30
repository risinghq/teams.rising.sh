import { Link } from "@tanstack/react-router";
import { Button } from "@/ui/button";

export function Login({ error }: { error?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border p-8 text-center">
        <h1 className="text-lg font-semibold">Teams</h1>
        <p className="text-xs text-muted-foreground">
          Mira qué está pendiente, quién lo tiene y cuánto falta.
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <Button asChild className="w-full">
          <a href="/api/auth/google">Continuar con Google</a>
        </Button>
        <p className="text-xs text-muted-foreground">
          <Link to="/privacidad" className="hover:underline">
            Privacidad
          </Link>
          {" · "}
          <Link to="/terminos" className="hover:underline">
            Términos
          </Link>
        </p>
      </div>
    </div>
  );
}
