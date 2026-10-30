import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

export type MenuOption = { value: string; label: string; lead?: ReactNode };

// A task field shown as its value, which opens the choices on click. A native
// select cannot show a choice's status dot or avatar, and draws a box around
// every field of the panel.
export function FieldMenu({
  label,
  value,
  options,
  onChange,
  chevron = "hover",
  align = "start",
  className,
}: {
  label: string;
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
  // "always" where nothing else says the value is a choice, outside a panel of
  // fields.
  chevron?: "hover" | "always";
  align?: "start" | "end";
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${label}: ${current?.label ?? ""}`}
          className={cn(
            "group -ml-2 max-w-full gap-2 px-2 font-normal",
            className,
          )}
        >
          {current?.lead}
          <span className="truncate">{current?.label}</span>
          <ChevronDown
            className={cn(
              "text-muted-foreground",
              chevron === "hover" &&
                "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-48">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              <span className="flex min-w-0 items-center gap-2">
                {o.lead}
                <span className="truncate">{o.label}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
