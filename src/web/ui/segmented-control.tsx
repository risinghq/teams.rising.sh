import type * as React from "react";
import { cn } from "@/lib/cn";

type SegmentOption<Value extends string> = {
  value: Value;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  // Shows only the icon; the label still names the option.
  iconOnly?: boolean;
};

// A mutually exclusive choice with equal-width options and a sliding
// indicator. Every option is a button, so the keyboard needs no extra wiring.
function SegmentedControl<Value extends string>({
  className,
  disabled = false,
  legend,
  onValueChange,
  options,
  value,
}: {
  className?: string;
  disabled?: boolean;
  legend: string;
  onValueChange: (value: Value) => void;
  options: readonly SegmentOption<Value>[];
  value: Value;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <fieldset
      className={cn(
        "relative isolate h-8 max-w-full shrink-0 overflow-hidden rounded-md bg-muted/45 p-0.5 pointer-coarse:h-11",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      disabled={disabled}
    >
      <legend className="sr-only">{legend}</legend>
      <div
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 z-0 rounded-md bg-background shadow-sm transition-transform duration-200 ease-in-out motion-reduce:transition-none"
        style={{
          transform: `translateX(${selectedIndex * 100}%)`,
          width: `calc((100% - 0.25rem) / ${options.length})`,
        }}
      />
      {/* A fieldset's legend escapes grid layout, so the columns live on an
          inner wrapper the legend is not part of. */}
      <div className="grid h-full auto-cols-fr grid-flow-col">
        {options.map(({ value: optionValue, label, Icon, iconOnly }) => (
          <button
            aria-pressed={value === optionValue}
            aria-label={iconOnly ? label : undefined}
            className={cn(
              "relative z-10 flex h-full items-center justify-center gap-1.5 rounded-md bg-transparent px-2.5 text-xs font-medium transition-colors duration-150 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              value === optionValue
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={optionValue}
            onClick={() => onValueChange(optionValue)}
            type="button"
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {!iconOnly && label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export { SegmentedControl, type SegmentOption };
