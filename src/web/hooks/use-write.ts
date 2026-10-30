import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  invalidateAfter,
  type WriteName,
  type WriteScope,
} from "@/lib/invalidation";
import { applyPatches, type Patch, type Read } from "@/lib/optimistic";

type Options<A> = {
  // What the write changes in the cache before the server answers. A failure
  // puts the cache back.
  optimistic?: (args: A, read: Read) => Patch[];
  // The form shows the failure next to its button instead of a toast.
  inline?: boolean;
};

// A write to the API that refreshes only the queries it changes, after it
// succeeds or fails. The mutation stays pending until those refetch, so a form
// can wait for fresh data. The shared mutation cache reports a failure as a
// toast unless the form shows it.
export function useWrite<N extends WriteName, A extends WriteScope<N>, R>(
  name: N,
  write: (args: A) => Promise<R>,
  { optimistic, inline }: Options<A> = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    meta: { inline },
    onMutate: (args) =>
      optimistic &&
      applyPatches(
        client,
        optimistic(args, (key) => client.getQueryData(key)),
      ),
    onError: (_error, _args, undo) => undo?.(),
    onSettled: (_data, _error, args) => invalidateAfter(client, name, args),
  });
}
