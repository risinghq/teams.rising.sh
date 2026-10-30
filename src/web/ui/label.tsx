import type * as React from "react";
import { cn } from "@/lib/cn";

// The caller gives the label its control by wrapping it or with `htmlFor`.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-xs font-medium", className)} {...props} />;
}

export { Label };
