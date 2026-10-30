import type { ReactNode } from "react";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border bg-surface">
      <h2 className="px-4 pt-4 pb-1 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
