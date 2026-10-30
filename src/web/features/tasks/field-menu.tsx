import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
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
}: {
  label: string;
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${label}: ${current?.label ?? ""}`}
          className="group -ml-2 max-w-full gap-2 px-2 font-normal"
        >
          {current?.lead}
          <span className="truncate">{current?.label}</span>
          <ChevronDown className="text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
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
