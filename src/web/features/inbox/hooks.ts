import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/lib/query-keys";

export const useInbox = () =>
  useQuery({
    queryKey: queryKeys.inbox,
    queryFn: api.inbox,
    refetchInterval: 60_000,
  });

type InboxData = Awaited<ReturnType<typeof api.inbox>>;

// Reading clears the unread count but keeps each item's flag, so the dots of
// this visit stay until the inbox is fetched again.
export function useReadInbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.readInbox,
    meta: { silent: true },
    onSuccess: () =>
      client.setQueryData<InboxData>(
        queryKeys.inbox,
        (data) => data && { ...data, unread: 0 },
      ),
  });
}
