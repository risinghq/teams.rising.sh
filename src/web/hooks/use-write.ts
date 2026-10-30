import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  invalidateAfter,
  type WriteName,
  type WriteScope,
} from "@/lib/invalidation";

// A write to the API that refreshes only the queries it changes. The mutation
// stays pending until those refetch, so a form can wait for fresh data. The
// shared mutation cache reports a failure as a toast.
export function useWrite<N extends WriteName, A extends WriteScope<N>, R>(
  name: N,
  write: (args: A) => Promise<R>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (_data, args) => invalidateAfter(client, name, args),
  });
}
