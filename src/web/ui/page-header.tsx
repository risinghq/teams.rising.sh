import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The bar at the top of a screen: the page's only `h1`, an optional line under
// it, and its controls. Controls scroll sideways on phones so filters do not
// push the content down.
function PageHeader({
  title,
  icon,
  description,
  action,
}: {
  title: string;
  icon?: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-12 flex-wrap items-center gap-3 border-b px-4 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold">{title}</h1>
          {description && (
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="ml-auto flex max-w-full items-center gap-2 overflow-x-auto p-0.5 sm:flex-wrap [&>*]:shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}

// A band that titles a group of rows, with an optional count.
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
        "border-b bg-sidebar px-4 py-1.5 text-xs font-medium",
        tone === "destructive" && "text-destructive",
      )}
    >
      {children}
      {count !== undefined && (
        <>
          {" "}
          <span className="text-muted-foreground">{count}</span>
        </>
      )}
    </h2>
  );
}

export { GroupHeading, PageHeader };
