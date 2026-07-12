# ABC Research Platform

Institutional-grade financial research and market intelligence platform built with **Next.js** and **React**, deployable on **Vercel**.

## Stack

- **Frontend:** Next.js 15 App Router, React 19
- **API:** Next.js Route Handlers (`/api/*`) — same endpoints as legacy Express server
- **Data:** NSE India, Yahoo Finance Chart API
- **Exports:** PDF (pdfkit), Excel (exceljs), CSV

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:4000](http://localhost:4000)

## Production Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Framework preset: **Next.js** (auto-detected)
4. Deploy — no environment variables required for basic operation

Writable JSON stores use `/tmp/abc-data` on Vercel (seeded from `data/` on cold start).

## Modules

| Route | Module |
|-------|--------|
| `/nifty500` | NIFTY 500 Dashboard |
| `/fiidii` | FII & DII Intelligence |
| `/research` | AI Research Mode |
| `/nifty-strategy` | NIFTY Strategy Center |
| `/fno` | Equity F&O Center |
| `/ipo` | IPO Intelligence Center |
| `/reports` | Downloadable Reports |

## AI Research Copilot

Public endpoint (no `API_SECRET` required):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/copilot` | Verified-data Q&A |
| `GET` | `/api/copilot/suggestions` | Suggested queries + engine status |
| `GET` | `/api/copilot/status` | Readiness (no secrets) |

**UI:** Top bar search (`Ctrl/Cmd+K`), sidebar panel, and full modal.

**Data policy:** Answers are built from Yahoo Finance + NSE FII/DII + ABC technical models only. Optional `XAI_API_KEY` polishes prose; it never invents numbers. Missing metrics show **Data Unavailable**.

## Data Integrity

The platform never hallucinates financial data. Unverified metrics display explicit unavailability messages with source and freshness metadata.

## Legacy Express Server

The original Express server is preserved at `server.js` for reference:

```bash
npm run legacy:server
```