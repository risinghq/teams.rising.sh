import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type * as React from "react";
import { cn } from "@/lib/cn";
import { POPOVER_MOTION_CLASS, POPOVER_SURFACE_CLASS } from "./overlay";

// Hover-only disclosure needs a deliberate pause. With no skip delay, tooltips
// do not cascade open while the pointer crosses neighbouring controls.
function TooltipProvider({
  delayDuration = 500,
  skipDelayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

function Tooltip({
  disableHoverableContent = true,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Root
      disableHoverableContent={disableHoverableContent}
      {...props}
    />
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "pointer-events-none z-50 origin-(--radix-tooltip-content-transform-origin) overflow-hidden rounded-md px-3 py-1.5 text-xs",
          POPOVER_SURFACE_CLASS,
          POPOVER_MOTION_CLASS,
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
