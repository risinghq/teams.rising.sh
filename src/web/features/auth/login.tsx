import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/button";

// What people ask the group chat. The headline cycles through them.
const ASKS = [
  "el informe?",
  "la propuesta?",
  "el evento?",
  "la entrega?",
  "lo del viernes?",
];

function useCycle(length: number, ms: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return index;
}

export function Login({ error }: { error?: string }) {
  const current = useCycle(ASKS.length, 2800);
  return (
    <main className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-xl flex-col gap-7">
        <div className="flex items-center gap-2.5 font-semibold">
          <svg viewBox="0 0 32 32" aria-hidden className="size-6">
            <rect width="32" height="32" rx="8" fill="#8b3ff0" />
            <path
              d="M9 10h14M16 10v13"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
          Teams
        </div>
        <h1 className="text-[2.5rem] leading-[1.06] font-semibold tracking-tight sm:text-[3.5rem]">
          ¿Cómo va
          <span className="sr-only"> el trabajo de tu equipo?</span>
          <span aria-hidden className="relative block h-[1.1em] text-primary">
            {ASKS.map((ask, i) => (
              <span
                key={ask}
                className={cn(
                  "absolute left-0 whitespace-nowrap transition-[opacity,filter,translate] motion-reduce:translate-none motion-reduce:blur-none",
                  i === current
                    ? "translate-y-0 opacity-100 blur-none duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    : "-translate-y-[0.18em] opacity-0 blur-sm duration-300 ease-in",
                )}
              >
                {ask}
              </span>
            ))}
          </span>
        </h1>
        <p className="text-base text-muted-foreground">
          Entra y míralo. Sin preguntar en el chat.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col items-start gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 gap-2.5 bg-foreground px-5 text-[15px] text-background hover:bg-foreground/90"
          >
            <a href="/api/auth/google">
              <span className="rounded bg-white p-[3px]">
                <GoogleMark />
              </span>
              Continuar con Google
            </a>
          </Button>
          <p className="text-sm text-muted-foreground">
            Usa la cuenta que tu equipo registró.
          </p>
        </div>
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
