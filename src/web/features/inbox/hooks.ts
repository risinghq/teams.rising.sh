import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent } from "react";
import { api } from "@/api";
import { queryKeys } from "@/lib/query-keys";

export const useInbox = () =>
  useQuery({
    queryKey: queryKeys.inbox,
    queryFn: api.inbox,
    refetchInterval: 60_000,
  });

type InboxData = Awaited<ReturnType<typeof api.inbox>>;

// Marks the items of one task, or of every task, read in the cache, so the
// count and the dots clear before the inbox is fetched again.
const markRead =
  (key?: string) =>
  (data: InboxData | undefined): InboxData | undefined => {
    if (!data) return data;
    const items = data.items.map((i) =>
      key === undefined || i.task_key === key ? { ...i, unread: false } : i,
    );
    const unread = new Set(items.filter((i) => i.unread).map((i) => i.task_key))
      .size;
    return { unread, items };
  };

export function useReadInbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.readInbox,
    meta: { silent: true },
    onSuccess: () =>
      client.setQueryData<InboxData>(queryKeys.inbox, markRead()),
  });
}

// Opening a task with unread inbox items reads them.
export function useReadTaskOnOpen(key: string) {
  const client = useQueryClient();
  const unread = useInbox().data?.items.some(
    (i) => i.task_key === key && i.unread,
  );
  const read = useMutation({
    mutationFn: api.readInboxTask,
    meta: { silent: true },
    onSuccess: (_, key) =>
      client.setQueryData<InboxData>(queryKeys.inbox, markRead(key)),
  });
  const readTask = useEffectEvent(() => {
    if (!read.isPending) read.mutate(key);
  });
  useEffect(() => {
    if (unread) readTask();
  }, [unread, key]);
}
