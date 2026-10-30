import { STATUS_LABEL, type TaskStatus } from "@/lib/domain";

const STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: "var(--muted-foreground)",
  todo: "var(--foreground)",
  in_progress: "var(--primary)",
  blocked: "var(--destructive)",
  done: "var(--ok)",
  canceled: "var(--muted-foreground)",
};

export function StatusDot({ status }: { status: TaskStatus }) {
  const filled = status === "done" ? 1 : status === "in_progress" ? 0.5 : 0;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      role="img"
      aria-label={STATUS_LABEL[status]}
      className="shrink-0"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke={STATUS_COLOR[status]}
        strokeWidth="1.5"
        strokeDasharray={status === "backlog" ? "2 2" : undefined}
      />
      {filled > 0 && (
        <path
          d={
            filled === 1
              ? "M7 1.5A5.5 5.5 0 1 1 7 12.5A5.5 5.5 0 1 1 7 1.5Z"
              : "M7 3.5A3.5 3.5 0 0 1 7 10.5Z"
          }
          fill={STATUS_COLOR[status]}
        />
      )}
      {status === "canceled" && (
        <path
          d="M4.5 4.5l5 5M9.5 4.5l-5 5"
          stroke={STATUS_COLOR[status]}
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
