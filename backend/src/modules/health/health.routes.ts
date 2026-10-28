import { Router } from "express";
import { pool } from "../../db/pool.js";

export const healthRouter = Router();

const startedAt = new Date();

/**
 * Liveness + readiness in one: 200 when the API can reach the database,
 * 503 otherwise. The web UI polls this to detect a sleeping (cold) instance.
 */
healthRouter.get("/", async (_req, res) => {
  const base = { uptime_seconds: Math.round(process.uptime()), started_at: startedAt };
  try {
    const t0 = performance.now();
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "up", db_latency_ms: Math.round(performance.now() - t0), ...base });
  } catch {
    res.status(503).json({ status: "degraded", database: "down", ...base });
  }
});
