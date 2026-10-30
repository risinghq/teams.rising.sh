import { Link } from "@tanstack/react-router";
import { Button } from "@/ui/button";

export function Login({ error }: { error?: string }) {
  return (
    <main className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-surface p-8 shadow-card">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Mira qué está pendiente, quién lo tiene y cuánto falta.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button asChild size="lg" className="w-full px-4">
          <a href="/api/auth/google">Continuar con Google</a>
        </Button>
        <p className="text-xs text-muted-foreground">
          <Link
            to="/privacidad"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacidad
          </Link>
          {" · "}
          <Link
            to="/terminos"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Términos
          </Link>
        </p>
      </div>
    </main>
  );
}
