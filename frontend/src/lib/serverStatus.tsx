import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, onNetworkFailure } from "./api";

/**
 * Cold-start awareness.
 *
 * Free-tier hosts put idle instances to sleep; the first request then waits
 * while the container boots. Instead of a frozen UI or a wall of errors, we
 * probe /health and expose a status the shell renders as a "waking up" state.
 *
 *   checking -> online                    (answered fast)
 *   checking -> waking -> online          (slow first answer = cold start)
 *   waking   -> offline                   (gave up after WAKE_BUDGET_MS)
 */
export type ServerState = "checking" | "waking" | "online" | "offline";

interface ServerStatus {
  state: ServerState;
  latencyMs: number | null;
  /** When the current wake attempt started (for the elapsed timer). */
  wakeStartedAt: number | null;
  retry: () => void;
}

const SLOW_THRESHOLD_MS = 1500; // longer than this = treat as cold start
const PROBE_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 2500;
const WAKE_BUDGET_MS = 120_000;
const HEARTBEAT_MS = 60_000;

const Ctx = createContext<ServerStatus | null>(null);

export function ServerStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ServerState>("checking");
  const [latencyMs, setLatency] = useState<number | null>(null);
  const [wakeStartedAt, setWakeStartedAt] = useState<number | null>(null);
  const run = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const probe = useCallback(async () => {
    const id = ++run.current;
    const started = Date.now();
    // Re-checks from an "online" state stay quiet unless they turn out slow.
    if (stateRef.current !== "online") setState("checking");
    setWakeStartedAt(null);

    // Flip to "waking" if the first answer is slow, without waiting for it.
    const slowTimer = setTimeout(() => {
      if (run.current === id) {
        setState("waking");
        setWakeStartedAt(started);
      }
    }, SLOW_THRESHOLD_MS);

    try {
      while (run.current === id) {
        const t0 = performance.now();
        try {
          const health = await api.health(PROBE_TIMEOUT_MS);
          if (run.current !== id) return;
          if (health.status === "ok") {
            setLatency(Math.round(performance.now() - t0));
            setState("online");
            return;
          }
        } catch {
          // Not up yet; keep polling.
        }
        if (Date.now() - started > WAKE_BUDGET_MS) {
          if (run.current === id) setState("offline");
          return;
        }
        if (run.current === id && Date.now() - started > SLOW_THRESHOLD_MS) {
          setState("waking");
          setWakeStartedAt(started);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  // Initial probe.
  useEffect(() => {
    void probe();
    return () => {
      run.current++;
    };
  }, [probe]);

  // Any request that fails to connect re-triggers detection (the instance may
  // have gone back to sleep while the tab sat idle).
  useEffect(
    () =>
      onNetworkFailure(() => {
        if (stateRef.current === "online") void probe();
      }),
    [probe],
  );

  // Light heartbeat keeps the latency indicator honest.
  useEffect(() => {
    if (state !== "online") return;
    const t = setInterval(async () => {
      const t0 = performance.now();
      try {
        await api.health(PROBE_TIMEOUT_MS);
        setLatency(Math.round(performance.now() - t0));
      } catch {
        void probe();
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [state, probe]);

  return (
    <Ctx.Provider value={{ state, latencyMs, wakeStartedAt, retry: probe }}>{children}</Ctx.Provider>
  );
}

export function useServerStatus() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useServerStatus must be used inside ServerStatusProvider");
  return ctx;
}
