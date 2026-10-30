import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/cn";

// `plain` and `auto` strip all chrome and size, for clickable rows and cards
// that bring their own layout but keep the focus ring and disabled behavior.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-safe:active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline: "border border-input/40 bg-background hover:bg-muted/70",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        plain: "motion-safe:active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 [&_svg]:size-4",
        sm: "h-8 px-3 text-xs [&_svg]:size-4",
        xs: "h-6 px-2 text-xs [&_svg]:size-4",
        lg: "h-10 px-8 [&_svg]:size-4",
        icon: "h-8 w-8 [&_svg]:size-4",
        "icon-xs": "h-6 w-6 [&_svg]:size-3.5",
        auto: "text-left font-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
