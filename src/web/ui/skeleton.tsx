import type * as React from "react";
import { cn } from "@/lib/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonRows };
