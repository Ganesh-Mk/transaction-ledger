import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

/** Deterministic soft-colour avatar with initials. */
const AVATAR_TONES = [
  "bg-accent-100 text-accent-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-semibold",
        AVATAR_TONES[hash % AVATAR_TONES.length],
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-12 text-base",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md text-subtle transition hover:bg-surface-raised hover:text-primary",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Monospace id with a copy button. */
export function IdChip({ id, display, className }: { id: string; display?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-xs text-muted", className)}>
      <span className="truncate">{display ?? id}</span>
      <CopyButton value={id} label="Copy id" />
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-canvas text-subtle shadow-xs">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-primary">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "accent",
  loading,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  tone?: "accent" | "success" | "danger" | "neutral";
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            tone === "accent" && "bg-accent-soft text-accent",
            tone === "success" && "bg-success/10 text-success",
            tone === "danger" && "bg-danger/10 text-danger",
            tone === "neutral" && "bg-surface-raised text-muted",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      {loading ? (
        <div className="lg-shimmer mt-2.5 h-6 w-28 rounded-md" />
      ) : (
        <p className="tabular mt-2 text-[22px] leading-7 font-semibold tracking-tight text-primary">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-subtle">{sub}</p>}
    </div>
  );
}
