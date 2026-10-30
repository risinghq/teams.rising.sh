import type * as React from "react";
import { cn } from "@/lib/cn";
import { fieldVariants } from "./field";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldVariants({ size: "area" }), className)}
      {...props}
    />
  );
}

export { Textarea };
