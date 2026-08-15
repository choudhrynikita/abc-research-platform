# Deployment Guide

## Production targets

| Target | How |
|--------|-----|
| **GitHub** | Push to `main` (source of truth) |
| **CI** | GitHub Actions workflow `.github/workflows/ci.yml` |
| **Hosting** | [Vercel](https://vercel.com) (recommended for Next.js) |

## Continuous Integration

Every push and pull request to `main` runs:

1. `npm ci`
2. `npm run lint`
3. `npm test` (unit + layout contracts + focus-trap)
4. `npm run build`
5. Production server smoke (`npm run smoke`)
6. Multi-viewport Playwright matrix (`npm run test:responsive`)

View runs: **GitHub → Actions → CI**

Badge (after first successful run):

```markdown
[![CI](https://github.com/choudhrynikita/abc-research-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/choudhrynikita/abc-research-platform/actions/workflows/ci.yml)
```

## Deploy to Vercel (live URL)

### First-time link

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns the repo.
2. **Add New Project** → import `choudhrynikita/abc-research-platform`.
3. Framework: **Next.js** (auto-detected from `vercel.json` / package).
4. Root directory: repository root.
5. Environment variables (optional but recommended in production):

| Variable | Purpose |
|----------|---------|
| `API_SECRET` | Bearer auth for mutation endpoints |
| `XAI_API_KEY` | Optional Copilot prose polish (never invents numbers) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Durable JSON stores |
| `ABC_TOP50_FULL` | `1` for full NIFTY 500 screen (Pro / warm cache) |

6. Deploy. Vercel assigns a production URL, typically:

```text
https://abc-research-platform.vercel.app
```

or a team-custom domain.

### Ongoing deploys

- Every push to `main` triggers a production deployment when the project is linked.
- Preview deployments are created for pull requests automatically.

### Confirm live URL

```bash
# After Vercel CLI login + link (optional)
npx vercel ls
npx vercel inspect
```

Or open the Vercel project **Deployments** tab — production domain is listed under **Domains**.

### Local production parity

```bash
npm ci
npm run test:ci
npm start
# other terminal:
npm run smoke
npx playwright install chromium
npm run test:responsive
```

## Data integrity (deploy unchanged)

- Never invent prices, fundamentals, or indicators.
- Unavailable fields must show explicit unavailability messages.
- No secrets in the client bundle — only `NEXT_PUBLIC_*` would be exposed (this app does not ship API keys to the browser).

## Rollback

1. Vercel → Deployments → promote a previous successful deployment, or  
2. `git revert` the bad commit on `main` and push.
