import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The standard surface: hairline border, soft shadow, rounded-xl. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-border bg-surface shadow-xs", className)} {...props} />;
}

/** Card header row: title + optional description on the left, actions on the right. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border px-4 py-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-primary">{title}</h2>
        {description && <p className="mt-0.5 truncate text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
