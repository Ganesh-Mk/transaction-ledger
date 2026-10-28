import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openApiDocument } from "./docs/openapi.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { accountRouter } from "./modules/accounts/account.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { statsRouter } from "./modules/stats/stats.routes.js";
import { transactionRouter } from "./modules/transactions/transaction.routes.js";
import { transferRouter } from "./modules/transfers/transfer.routes.js";

function corsOrigin(): cors.CorsOptions["origin"] {
  if (env.CORS_ORIGIN === "*") return true;
  const allowed = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
  return allowed;
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.set("query parser", "simple"); // flat ?a=1&b=2 only; no nested objects from query strings

  // Swagger UI needs inline scripts/styles, so CSP is relaxed for /api/docs only.
  const strictHeaders = helmet();
  const docsHeaders = helmet({ contentSecurityPolicy: false });
  app.use((req, res, next) => (req.path.startsWith("/api/docs") ? docsHeaders : strictHeaders)(req, res, next));
  app.use(cors({ origin: corsOrigin(), exposedHeaders: ["X-Request-Id", "Location"] }));
  app.use(requestContext);
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "Transaction Ledger API",
      docs: "/api/docs",
      openapi: "/api/openapi.json",
      health: "/health",
    });
  });

  app.use("/health", healthRouter);
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "Ledger API Docs",
      swaggerOptions: { defaultModelsExpandDepth: 0, docExpansion: "list" },
    }),
  );

  app.use("/api/accounts/:accountId/transactions", transactionRouter);
  app.use("/api/accounts", accountRouter);
  app.use("/api/transfers", transferRouter);
  app.use("/api/stats", statsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
