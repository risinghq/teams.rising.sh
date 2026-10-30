import type { ReactNode } from "react";

function EmptyState({
  title,
  as: Title = "p",
  children,
  action,
}: {
  title: string;
  as?: "p" | "h1";
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Title className="text-base font-semibold">{title}</Title>
      {children && (
        <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
