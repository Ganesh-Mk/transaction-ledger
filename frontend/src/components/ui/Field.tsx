import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-[13px] font-medium text-primary", className)} {...props} />;
}

const controlBase =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-primary shadow-xs " +
  "placeholder:text-subtle transition focus:border-accent focus:outline-3 focus:outline-offset-0 " +
  "focus:outline-accent/15 disabled:bg-surface-raised disabled:opacity-60 " +
  "aria-invalid:border-danger aria-invalid:focus:outline-danger/15";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-9", className)} {...props} />;
}

/** Input with a leading and/or trailing adornment (icon, currency symbol, button). */
export function InputGroup({
  leading,
  trailing,
  className,
  inputClassName,
  ...props
}: ComponentProps<"input"> & { leading?: ReactNode; trailing?: ReactNode; inputClassName?: string }) {
  return (
    <div className={cn("relative", className)}>
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-subtle [&_svg]:size-4">
          {leading}
        </span>
      )}
      <input
        className={cn(controlBase, "h-9", leading && "pl-9", trailing && "pr-10", inputClassName)}
        {...props}
      />
      {trailing && <span className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</span>}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-18 resize-none py-2 leading-5", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlBase, "h-9 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}

export function Hint({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1.5 text-xs text-muted", className)} {...props} />;
}

export function FieldError({ className, children, ...props }: ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("mt-1.5 text-xs font-medium text-danger", className)} {...props}>
      {children}
    </p>
  );
}

/** Label + control + hint/error, stacked. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
      </Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}
