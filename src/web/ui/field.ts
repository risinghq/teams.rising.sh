import { cva } from "class-variance-authority";

// The look shared by Input, Select and Textarea (`area`). Text is 16px below `md` so iOS
// does not zoom in on focus. The field is a shade lighter than the page so it
// reads as a place to type. Hover moves the edge toward the text color, so the
// pointer gets an answer; focus turns it to the primary color with a soft halo.
export const fieldVariants = cva(
  "flex w-full rounded-lg border border-input bg-surface text-base transition-[color,background-color,border-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground enabled:not-focus:hover:border-foreground/60 focus-visible:border-primary focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      size: {
        default: "h-9 px-3 py-1",
        sm: "h-8 px-2.5 py-1 md:text-xs",
        area: "min-h-20 px-3 py-2",
      },
      // A field that sits inside a row, such as a quick-add line, which
      // draws the edge or the focus tint itself.
      appearance: {
        boxed: "",
        bare: "border-0 bg-transparent focus-visible:ring-0",
        // Use an underline when the field is the page's primary control.
        underline:
          "rounded-none border-0 border-b border-input bg-transparent px-0 focus-visible:border-primary focus-visible:ring-0",
      },
    },
    defaultVariants: { size: "default", appearance: "boxed" },
  },
);
