import type * as React from "react";
import { cn } from "@/lib/cn";

type SegmentOption<Value extends string> = {
  value: Value;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  // Shows only the icon; the label still names the option.
  iconOnly?: boolean;
};

type SegmentProps = {
  className: string;
  children: React.ReactNode;
  "aria-label"?: string;
  "aria-current"?: "true";
};

// A mutually exclusive choice with equal-width options and a sliding
// indicator. Options are buttons unless `renderOption` returns something else,
// typically a router link, so a choice that lives in the URL can be opened in
// a new tab. A link marks the current option with `aria-current`.
function SegmentedControl<Value extends string>({
  className,
  disabled = false,
  legend,
  onValueChange,
  options,
  renderOption,
  value,
}: {
  className?: string;
  disabled?: boolean;
  legend: string;
  onValueChange?: (value: Value) => void;
  options: readonly SegmentOption<Value>[];
  renderOption?: (
    option: SegmentOption<Value>,
    props: SegmentProps,
  ) => React.ReactNode;
  value: Value;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <fieldset
      className={cn(
        "relative isolate h-8 max-w-full shrink-0 overflow-hidden rounded-lg bg-muted/45 p-0.5 pointer-coarse:h-11",
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
        {options.map((option) => {
          const { value: optionValue, label, Icon, iconOnly } = option;
          const on = value === optionValue;
          const props: SegmentProps = {
            className: cn(
              "relative z-10 flex h-full items-center justify-center gap-1.5 rounded-md bg-transparent px-3 text-xs transition-colors duration-150 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              on
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ),
            "aria-label": iconOnly ? label : undefined,
            "aria-current": renderOption && on ? "true" : undefined,
            children: (
              <>
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {!iconOnly && label}
              </>
            ),
          };
          return renderOption ? (
            <span key={optionValue} className="contents">
              {renderOption(option, props)}
            </span>
          ) : (
            <button
              {...props}
              aria-pressed={on}
              key={optionValue}
              onClick={() => onValueChange?.(optionValue)}
              type="button"
            />
          );
        })}
      </div>
    </fieldset>
  );
}

export { SegmentedControl, type SegmentOption };
