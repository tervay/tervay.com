# tervay.com

Turborepo monorepo for apps deployed with Coolify on admin.tervay.com.

```sh
bun install
bun run dev
bun run test
bun run typecheck
```

## apps/artifacts

Public HTML artifacts at https://artifacts.tervay.com. Reading is open to everyone. Writing needs the bearer token.

### API

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/artifacts` | none | |
| POST | `/api/artifacts` | bearer | `{"title", "html"}` |
| PUT | `/api/artifacts/:id` | bearer | `{"title"?, "html"?}` |
| DELETE | `/api/artifacts/:id` | bearer | |

Pages: `/` (gallery), `/a/:id` (viewer), `/raw/:id/` (the HTML itself).

Publish a file:

```sh
curl -X POST https://artifacts.tervay.com/api/artifacts \
  -H "Authorization: Bearer $ARTIFACTS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg t 'My page' --rawfile h page.html '{title:$t, html:$h}')"
```

Artifacts run in a sandbox with an opaque origin. They can't reach the gallery page, and `localStorage` is not available inside them.

### Run locally

```sh
ARTIFACTS_TOKEN=dev bun run --cwd apps/artifacts dev
```

Data goes to `apps/artifacts/data/`.

### Deploy on Coolify

1. New resource → this repo → Build pack **Dockerfile**.
2. Base directory `/`, Dockerfile location `/apps/artifacts/Dockerfile`, port `3000`.
3. Domain `https://artifacts.tervay.com`. Point a DNS A record at the VPS.
4. Env var `ARTIFACTS_TOKEN` = output of `openssl rand -hex 32`.
5. Persistent storage: mount a volume at `/data`.
