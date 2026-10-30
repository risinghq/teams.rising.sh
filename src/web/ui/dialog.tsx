import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/cn";
import { MODAL_MOTION_CLASS, SCRIM_CLASS } from "./overlay";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(SCRIM_CLASS, className)}
      {...props}
    />
  );
}

type DialogContentProps = React.ComponentProps<
  typeof DialogPrimitive.Content
> & {
  showCloseButton?: boolean;
  placement?: "center" | "top";
};

function DialogContent({
  className,
  children,
  showCloseButton = true,
  placement = "center",
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-50 grid justify-items-center overflow-x-hidden overflow-y-auto p-4",
          placement === "center"
            ? "place-items-center"
            : "items-start pt-[15vh]",
        )}
      >
        <DialogPrimitive.Content
          className={cn(
            "pointer-events-auto relative grid w-[calc(100vw-2rem)] max-w-2xl gap-4 rounded-2xl bg-background p-6 shadow-2xl outline-hidden",
            MODAL_MOTION_CLASS,
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus:outline-hidden">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-2 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
