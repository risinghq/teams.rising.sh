import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/api";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      // A background write whose failure the person need not see.
      silent?: boolean;
    };
  }
}

const isSignedOut = (error: Error) =>
  error instanceof ApiError && error.status === 401;

// An expired session sends the person to the login page. Any other failed
// write is told in a toast with the server's reason, so no form needs its own
// error line.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 10_000 } },
    queryCache: new QueryCache({
      onError: (error) => {
        if (isSignedOut(error)) window.location.assign("/login");
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isSignedOut(error)) return window.location.assign("/login");
        if (mutation.meta?.silent) return;
        toast.error("No se pudo guardar el cambio", {
          description: error.message,
        });
      },
    }),
  });
}
