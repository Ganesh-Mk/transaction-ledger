# Deployment

| Part | Host | URL |
|---|---|---|
| Web UI | Vercel (`frontend/`) | https://transaction-ledger-console.vercel.app |
| API | Render free web service (Docker, `render.yaml` Blueprint) | https://transaction-ledger-api-fdp4.onrender.com |
| Database | Neon serverless Postgres (Singapore) | (`DATABASE_URL` stored in Render) |

## How the UI reaches the API
`frontend/vercel.json` forwards `/api/*` and `/health` to the Render service, so the browser only ever talks to the Vercel domain.

- **No CORS round-trips:** requests are same-origin.
- **Not blocked by privacy tools:** browser privacy filters that block third-party requests to `*.onrender.com` don't apply. This was observed during testing.
- **One public URL** for reviewers.

The API still allows requests from the Vercel domains directly (`CORS_ORIGIN` in `render.yaml`).

## Redeploying
- **API:** pushing to `main` redeploys automatically (Blueprint-managed, `autoDeploy: true`).
- **UI:** run `cd frontend && vercel deploy --prod`.
- **Schema:** migrations run automatically when the API boots. To load demo data, run `DATABASE_URL=… npm run seed` from `backend/`.

## Cold starts
Render's free instances stop after about 15 minutes idle, and Neon also suspends compute when idle. The first request after a pause can take 30–60 seconds. The UI shows a "Waking up the server" screen until `/health` answers (see README → Cold starts). While the API is waking, Vercel's proxy may answer with 502 or 504. The UI treats those as "still waking" and keeps checking.
