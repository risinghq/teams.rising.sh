import { cva } from "class-variance-authority";

// The look shared by Input, Select and Textarea (`area`). Text is 16px below `md` so iOS
// does not zoom in on focus.
export const fieldVariants = cva(
  "flex w-full rounded-lg border border-input bg-background text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      size: {
        default: "h-9 px-3 py-1",
        sm: "h-8 px-2.5 py-1 md:text-xs",
        area: "min-h-20 px-3 py-2",
      },
      // A field that sits inside a row, such as a quick-add line, and shows
      // its edge only on focus.
      appearance: {
        boxed: "",
        bare: "border-transparent bg-transparent",
      },
    },
    defaultVariants: { size: "default", appearance: "boxed" },
  },
);
