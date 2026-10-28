import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  code?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string, code?: string) => void;
  info: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

const TONE: Record<ToastTone, { icon: typeof Info; className: string; bar: string }> = {
  success: { icon: CheckCircle2, className: "text-success", bar: "bg-success" },
  error: { icon: AlertTriangle, className: "text-danger", bar: "bg-danger" },
  info: { icon: Info, className: "text-accent", bar: "bg-accent" },
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++nextId;
      setToasts((t) => [...t.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const [api] = useState<ToastApi>(() => ({
    success: (title, description) => push({ tone: "success", title, description }),
    error: (title, description, code) => push({ tone: "error", title, description, code }),
    info: (title, description) => push({ tone: "info", title, description }),
  }));

  return (
    <Ctx.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
        >
          {toasts.map((t) => {
            const tone = TONE[t.tone];
            const Icon = tone.icon;
            return (
              <div
                key={t.id}
                role={t.tone === "error" ? "alert" : "status"}
                className="lg-slide-in-right pointer-events-auto relative overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
              >
                <div className="flex items-start gap-3 p-3.5 pr-10">
                  <Icon className={cn("mt-px size-4.5 shrink-0", tone.className)} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-primary">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-[13px] leading-5 text-muted">{t.description}</p>}
                    {t.code && (
                      <code className="mt-1.5 inline-block rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-muted">
                        {t.code}
                      </code>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="absolute top-2.5 right-2.5 rounded-md p-1 text-subtle hover:bg-surface-raised hover:text-primary"
                >
                  <X className="size-3.5" />
                </button>
                <div className={cn("lg-toast-bar absolute bottom-0 left-0 h-0.5 w-full opacity-60", tone.bar)} />
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
