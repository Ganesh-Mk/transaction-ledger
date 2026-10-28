import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  size = "sm",
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-lg border border-border bg-surface-raised p-0.5", className)}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 font-medium whitespace-nowrap transition [&_svg]:size-3.5",
              size === "sm" ? "h-7 text-xs" : "h-8 text-[13px]",
              active ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-primary",
            )}
          >
            {s.label}
            {s.count !== undefined && (
              <span className={cn("tabular text-[11px]", active ? "text-muted" : "text-subtle")}>{s.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
