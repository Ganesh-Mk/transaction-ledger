# Deploying to Railway

The app runs as three Railway services in one project, all deployed from this repository:

| Service | Source | Notes |
|---|---|---|
| **Postgres** | Railway Postgres template | Provides `DATABASE_URL` |
| **api** | root directory `backend/` (Dockerfile) | Runs migrations on boot |
| **web** | root directory `frontend/` (Dockerfile) | Static build served by nginx |

The UI and API are separate services on purpose. The static UI starts instantly, so when the API is asleep the UI can still load and show the **"Waking up the server"** screen instead of a blank page.

## Steps

1. Create a project in Railway and add **Postgres** (New → Database → PostgreSQL).
2. Add the **api** service: New → GitHub Repo → this repo. Then:
   - Settings → Root Directory: `backend`. The Dockerfile is detected automatically.
   - Set these variables:
     - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
     - `CORS_ORIGIN=https://<web-domain>` (fill in after step 3; `*` is fine for a demo)
     - `NODE_ENV=production`
   - Settings → Networking → Generate Domain.
   - Settings → Healthcheck Path: `/health`.
3. Add the **web** service from the same repo:
   - Root Directory: `frontend`.
   - Set the variable `VITE_API_URL=https://<api-domain>`. It's used at build time and baked into the bundle.
   - Generate Domain.
4. Optional: load demo data from a local shell with `railway run --service api npm run seed:prod`. Alternatively, run `npm run seed` locally with `DATABASE_URL` set to the Postgres public URL.

## Cold starts

If **Serverless / App Sleeping** is enabled on the `api` service (useful to save free credits), Railway stops the container after a period of inactivity. The next request then wakes it, which takes a few seconds plus boot time. The UI detects this through `/health` and shows the wake-up screen until the API answers. See "Cold starts" in the README.
