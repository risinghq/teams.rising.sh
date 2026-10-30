import type { ReactNode } from "react";
import { GroupHeading } from "@/ui/page-header";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b">
      <GroupHeading>{title}</GroupHeading>
      {children}
    </section>
  );
}
