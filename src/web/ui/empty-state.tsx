import type { ReactNode } from "react";

function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      {children && (
        <p className="max-w-sm text-xs text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { EmptyState };
