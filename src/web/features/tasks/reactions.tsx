import { SmilePlus } from "lucide-react";
import { REACTIONS } from "@shared/schemas";
import type { Update } from "@shared/types";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { useReact } from "./hooks";

type Props = { taskKey: string; update: Update };

function useToggle({ taskKey, update }: Props) {
  const react = useReact();
  return (emoji: string, on: boolean) =>
    react.mutate({ key: taskKey, updateId: update.id, emoji, on });
}

// The reactions on one update, each a toggle that shows who reacted.
export function ReactionList(props: Props) {
  const toggle = useToggle(props);
  if (props.update.reactions.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {props.update.reactions.map((r) => (
        <Button
          key={r.emoji}
          variant="outline"
          size="xs"
          aria-pressed={r.mine}
          aria-label={`${r.emoji} ${r.names.join(", ")}`}
          title={r.names.join(", ")}
          onClick={() => toggle(r.emoji, !r.mine)}
          className={cn(
            "rounded-full font-normal tabular-nums",
            r.mine && "border-primary/40 bg-primary/10",
          )}
        >
          {r.emoji} {r.names.length}
        </Button>
      ))}
    </div>
  );
}

// Adds or takes back a reaction. It shows on hover or focus of the update
// (a `group`), so a quiet timeline stays quiet.
export function ReactionMenu(props: Props) {
  const toggle = useToggle(props);
  const mine = new Set(
    props.update.reactions.filter((r) => r.mine).map((r) => r.emoji),
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Reaccionar"
          className="text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
        >
          <SmilePlus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex min-w-0 gap-0.5 p-1">
        {REACTIONS.map((emoji) => (
          <DropdownMenuItem
            key={emoji}
            aria-label={emoji}
            onSelect={() => toggle(emoji, !mine.has(emoji))}
            className={cn(
              "justify-center px-1.5 text-base",
              mine.has(emoji) && "bg-accent",
            )}
          >
            {emoji}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
