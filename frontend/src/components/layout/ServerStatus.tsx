import { useEffect, useState } from "react";
import { Moon, RefreshCw, ServerCrash, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useServerStatus } from "@/lib/serverStatus";

/** Compact status pill for the sidebar / top bar. */
export function ServerStatusPill({ className }: { className?: string }) {
  const { state, latencyMs } = useServerStatus();
  const config = {
    checking: { dot: "bg-subtle", label: "Connecting…" },
    waking: { dot: "bg-warning text-warning lg-pulse-ring", label: "Waking up" },
    online: { dot: "bg-success", label: latencyMs !== null ? `Online · ${latencyMs}ms` : "Online" },
    offline: { dot: "bg-danger", label: "Unreachable" },
  }[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted shadow-xs",
        className,
      )}
      title="API status"
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      <span className="tabular">{config.label}</span>
    </span>
  );
}

function useElapsed(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [since]);
  return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
}

const STEPS = [
  { at: 0, label: "Request received by the host" },
  { at: 4, label: "Starting the API container" },
  { at: 12, label: "Connecting to the database" },
  { at: 25, label: "Almost there…" },
];

/**
 * Shown in place of page content while the API isn't reachable yet.
 * Explains the cold start instead of showing spinners or errors.
 */
export function ServerWakeScreen() {
  const { state, wakeStartedAt, retry } = useServerStatus();
  const elapsed = useElapsed(state === "waking" ? wakeStartedAt : null);

  if (state === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2.5 text-[13px] text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          Connecting to the ledger API…
        </div>
      </div>
    );
  }

  if (state === "offline") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="lg-scale-in w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-md">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <ServerCrash className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-primary">Can't reach the API</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-muted">
            The server didn't respond within two minutes. It may be redeploying or out of free-tier hours. Please try
            again in a moment.
          </p>
          <Button className="mt-5" onClick={retry}>
            <RefreshCw /> Try again
          </Button>
        </div>
      </div>
    );
  }

  const activeStep = STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="lg-scale-in w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
        <div className="relative h-1 overflow-hidden bg-accent-50">
          <div className="lg-indeterminate absolute inset-y-0 left-0 w-full rounded-full bg-accent" />
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Moon className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-primary">Waking up the server</h2>
              <p className="mt-1 text-[13px] leading-5 text-muted">
                This demo runs on a free hosting tier that puts the API to sleep when idle. The first request boots it
                back up and usually takes <span className="font-medium text-primary">15–40 seconds</span>. Thanks for your
                patience.
              </p>
            </div>
          </div>

          <ol className="mt-5 space-y-2.5">
            {STEPS.map((step, i) => (
              <li key={step.label} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border transition",
                    i < activeStep && "border-success bg-success",
                    i === activeStep && "border-accent",
                    i > activeStep && "border-border-strong",
                  )}
                >
                  {i < activeStep ? (
                    <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" aria-hidden>
                      <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : i === activeStep ? (
                    <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  ) : null}
                </span>
                <span className={cn(i <= activeStep ? "text-primary" : "text-subtle")}>{step.label}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="size-3.5 text-accent" /> Elapsed <span className="tabular font-medium text-primary">{elapsed}s</span>
            </span>
            <span>Checking every few seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
