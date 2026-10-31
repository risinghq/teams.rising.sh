import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/cn";
import { fieldVariants } from "./field";

type TextareaProps = React.ComponentProps<"textarea"> &
  Pick<VariantProps<typeof fieldVariants>, "appearance">;

function Textarea({ className, appearance, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(fieldVariants({ size: "area", appearance }), className)}
      {...props}
    />
  );
}

export { Textarea, type TextareaProps };
