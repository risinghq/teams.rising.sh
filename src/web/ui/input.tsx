import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/cn";
import { fieldVariants } from "./field";

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof fieldVariants>;

function Input({ className, size, appearance, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        fieldVariants({ size, appearance }),
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input, type InputProps };
