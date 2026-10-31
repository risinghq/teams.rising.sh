import {
  infiniteQueryOptions,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import type { Task } from "@shared/types";
import { api, type TaskParams } from "@/api";
import { useWrite } from "@/hooks/use-write";
import {
  applyReaction,
  collaboratorAdded,
  collaboratorRemoved,
  commentEdited,
  commentRemoved,
  pendingComment,
  taskPatch,
  taskRemoved,
} from "@/lib/optimistic";
import { queryKeys } from "@/lib/query-keys";

const TASK_PAGE_SIZE = 50;

// One list of tasks, loaded a page at a time. The key is the list's query, so
// a write that invalidates `tasks.lists` refetches every page loaded so far.
export const taskPagesOptions = (query: TaskParams, limit = TASK_PAGE_SIZE) =>
  infiniteQueryOptions({
    queryKey: queryKeys.tasks.list(query),
    queryFn: ({ pageParam }) =>
      api.tasksPage({ ...query, limit: String(limit) }, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
  });

export function useTaskPages(query: TaskParams) {
  const pages = useInfiniteQuery(taskPagesOptions(query));
  const tasks = useMemo(
    () => pages.data?.pages.flatMap((p) => p.items),
    [pages.data],
  );
  const { fetchNextPage } = pages;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  return {
    tasks,
    isError: pages.isError,
    hasMore: pages.hasNextPage,
    isLoadingMore: pages.isFetchingNextPage,
    loadMore,
  };
}

export type TaskPages = ReturnType<typeof useTaskPages>;

// The first `limit` tasks of a query, for a count or a search box. `next` is
// set when there are more.
export const usePeekTasks = (
  query: TaskParams,
  limit: number,
  enabled = true,
) => {
  const full = { ...query, limit: String(limit) };
  return useQuery({
    queryKey: queryKeys.tasks.peek(full),
    queryFn: () => api.tasksPage(full),
    enabled,
    placeholderData: keepPreviousData,
  });
};

export const useTask = (key: string) =>
  useQuery({
    queryKey: queryKeys.tasks.detail(key),
    queryFn: () => api.task(key),
  });
export const useLabels = () =>
  useQuery({
    queryKey: queryKeys.labels,
    queryFn: api.labels,
    staleTime: 60_000,
  });

// The labels a team can use: its own plus the shared ones.
export function useTeamLabels(teamId: string | undefined) {
  return useLabels().data?.filter(
    (l) => l.team_id === null || l.team_id === teamId,
  );
}

export const useCreateTask = () =>
  useWrite(
    "createTask",
    (body: Record<string, unknown> & { parent?: string }) =>
      api.createTask(body),
    { inline: true },
  );
export const usePatchTask = () =>
  useWrite(
    "patchTask",
    ({
      key,
      patch,
    }: {
      key: string;
      parentId: string | null;
      patch: Record<string, unknown>;
    }) => api.patchTask(key, patch),
    { optimistic: taskPatch },
  );
export const useDeleteTask = () =>
  useWrite(
    "deleteTask",
    ({ key }: { key: string; parentId: string | null }) => api.deleteTask(key),
    { optimistic: taskRemoved },
  );
type CommentArgs = { key: string; updateId: string };
export const useEditComment = () =>
  useWrite(
    "editComment",
    ({ key, updateId, body }: CommentArgs & { body: string }) =>
      api.editComment(key, updateId, body),
    { optimistic: commentEdited },
  );
export const useDeleteComment = () =>
  useWrite(
    "deleteComment",
    ({ key, updateId }: CommentArgs) => api.deleteComment(key, updateId),
    { optimistic: commentRemoved },
  );
export const useComment = () =>
  useWrite(
    "comment",
    ({ key, body }: { key: string; body: string }) => api.comment(key, body),
    { optimistic: pendingComment, inline: true },
  );
type ReactArgs = { key: string; updateId: string; emoji: string; on: boolean };
export const useReact = () =>
  useWrite(
    "react",
    ({ key, updateId, emoji, on }: ReactArgs) =>
      api.react(key, updateId, emoji, on),
    { optimistic: applyReaction },
  );
type CollaboratorArgs = { key: string; userId: string };
export const useAddCollaborator = () =>
  useWrite(
    "addCollaborator",
    ({ key, userId }: CollaboratorArgs) => api.addCollaborator(key, userId),
    { optimistic: collaboratorAdded },
  );
export const useRemoveCollaborator = () =>
  useWrite(
    "removeCollaborator",
    ({ key, userId }: CollaboratorArgs) => api.removeCollaborator(key, userId),
    { optimistic: collaboratorRemoved },
  );

const wide = () => window.matchMedia("(min-width: 768px)").matches;

// A task opens in two places: the side panel of the current list on a wide
// screen, through the `task` search parameter, and its own page on a narrow
// one. Every task is also a link to its page, so a modified click (new tab,
// new window) skips this and opens the page.
export function useOpenTask() {
  const navigate = useNavigate();
  return (task: Pick<Task, "key" | "team" | "number">) => {
    if (wide()) {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          task: task.key,
        }),
      });
    } else {
      void navigate({
        to: "/t/$team/$number",
        params: { team: task.team, number: String(task.number) },
      });
    }
  };
}
