import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-4xl px-4 pb-24 sm:px-8", className)}
    >
      {children}
    </div>
  );
}

function PageHeader({
  title,
  icon,
  description,
  action,
  controls,
}: {
  title: string;
  icon?: ReactNode;
  description?: string;
  action?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 pt-8 pb-6">
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
      {controls && (
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
          {controls}
        </div>
      )}
    </header>
  );
}

function GroupHeading({
  children,
  count,
  tone,
}: {
  children: ReactNode;
  count?: number;
  tone?: "destructive";
}) {
  return (
    <h2
      className={cn(
        "flex items-baseline gap-2 px-3 pt-6 pb-2 text-xs text-muted-foreground",
        tone === "destructive" && "text-destructive",
      )}
    >
      <span className="font-semibold">{children}</span>
      {count !== undefined && <span className="tabular-nums">{count}</span>}
    </h2>
  );
}

export { GroupHeading, Page, PageHeader };
