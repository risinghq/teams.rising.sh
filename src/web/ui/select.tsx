import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/cn";
import { fieldVariants } from "./field";

type SelectProps = Omit<React.ComponentProps<"select">, "size"> &
  VariantProps<typeof fieldVariants>;

// A styled native select: the platform supplies the menu, the keyboard and the
// touch picker.
function Select({ className, size, appearance, ...props }: SelectProps) {
  return (
    <select
      className={cn(fieldVariants({ size, appearance }), className)}
      {...props}
    />
  );
}

export { Select, type SelectProps };
