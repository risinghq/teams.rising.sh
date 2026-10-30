import { useEffect, useRef } from "react";
import type { TaskPages } from "./hooks";

// The nearest ancestor that scrolls, which is the root the end-of-list check
// has to watch. The page's own scroll container is not the viewport.
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement)
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
  return null;
}

export function LoadMore({
  pages,
}: {
  pages: Pick<TaskPages, "hasMore" | "isLoadingMore" | "loadMore">;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = pages;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || isLoadingMore) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root: scroller(el), rootMargin: "0px 0px 400px 0px" },
    );
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  if (!hasMore) return null;
  return (
    <div
      ref={ref}
      role="status"
      className="py-6 text-center text-xs text-muted-foreground"
    >
      {isLoadingMore ? "Cargando más tareas…" : ""}
    </div>
  );
}
