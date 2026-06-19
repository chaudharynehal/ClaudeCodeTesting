# 🧭 JobPilot

A **local, self-hosted dashboard** that finds matched roles, auto-tailors your
résumé + cover letter to each one with Claude, and tracks every application
through a pipeline — from *matched* to *offer*.

You add your résumé and cover letter once. JobPilot pulls jobs from real job
boards, scores them against your filters, and — on demand — rewrites your
materials for a specific role. You review and submit; it remembers everything.

> **Honest scope — please read.** JobPilot is **assisted**, not a fully
> autonomous bot. It prepares everything and keeps you in the loop for the
> final *Submit* click. It does **not** log into LinkedIn/Indeed and click
> apply for you — that violates those sites' Terms of Service and routinely
> gets accounts banned. For those sites, use **Import a job** (paste the URL +
> description) and JobPilot tailors and tracks it like any other. It also never
> invents experience: tailoring only re-emphasizes and rephrases what's already
> in your résumé, and flags genuine gaps for you to address.

---

## Features

- **Profile & filters** — contact info, target roles, locations, skills,
  exclusions, salary floor, remote-only.
- **Job sources** — Greenhouse, Lever, Ashby (public ATS APIs) + RemoteOK and
  WeWorkRemotely, plus manual import for LinkedIn/Indeed/any URL.
- **Matching** — every fetched job is scored 0–100 against your filters, with
  reasons.
- **AI tailoring** — Claude (`claude-opus-4-8`) restructures your résumé and
  writes a role-specific cover letter, plus a fit summary and honest gap list.
- **Pipeline board** — Matched → Queued → Applied → Waiting → Responded →
  Interview → Offer / Rejected.
- **Email tracking (optional)** — scans your inbox over IMAP and advances
  application statuses automatically.
- **Analytics + A/B** — response/interview/offer rates, broken down by source
  and by résumé variant.
- **Interview & offer tracking** — log rounds, dates, outcomes, and offer
  details per application.

---

## Quick start

Requires **Node.js 18+** (Node 20/22 recommended).

```bash
cd job-autopilot
npm install
cp .env.example .env          # then edit .env (see below)
npm run setup                 # creates the SQLite DB + seeds starter sources
npm run dev                   # open http://localhost:3000
```

Then in the app:

1. **Profile** → paste your résumé + cover letter, set target roles / skills / locations.
2. **Matches** → *Fetch new jobs*, then *Tailor & open* on any role you like.
3. Review the tailored docs → *Open posting* → submit on the company site → *Mark applied*.
4. Watch it move across the **Pipeline**; check **Analytics** for what's working.

### `.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Local SQLite file. Leave as `file:./dev.db`. |
| `ANTHROPIC_API_KEY` | for tailoring | Get one at [console.anthropic.com](https://console.anthropic.com/). Without it you can still browse/match/track — only *Tailor* is disabled. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-4-8`. |
| `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASSWORD` | for email tracking | Gmail: use an [App Password](https://myaccount.google.com/apppasswords), not your login password. |

Your résumé, applications, and database stay on your machine. Only the job
description + your résumé text are sent to Anthropic, and only when you click
*Tailor*.

---

## Adding job boards

Under **Settings → ATS job sources**, add boards by their token, found in the
company's careers URL:

- Greenhouse → `boards.greenhouse.io/<token>`
- Lever → `jobs.lever.co/<slug>`
- Ashby → `jobs.ashbyhq.com/<board>`

RemoteOK and WeWorkRemotely are always included. The seed adds a few example
boards — edit them to match the companies you care about.

---

## How it works

```
Next.js (App Router, TypeScript)
├─ src/app/*            UI pages (pipeline, matches, profile, analytics, settings)
├─ src/app/api/*        Route handlers (Node runtime)
├─ src/lib/sources/*    ATS + remote-board connectors
├─ src/lib/match.ts     deterministic 0–100 scoring (no API calls)
├─ src/lib/anthropic.ts Claude tailoring (claude-opus-4-8)
├─ src/lib/email.ts     IMAP inbox scanning
└─ prisma/schema.prisma SQLite data model
```

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run setup` | `prisma db push` + seed (first run) |
| `npm run db:push` | Apply schema changes to the DB |
| `npm run build` / `npm start` | Production build / serve |

## Notes & limits

- ATS APIs and remote boards are public and rate-limited; a source that fails
  to fetch is skipped without blocking the others (see the count on *Fetch*).
- Direct scraping of LinkedIn/Indeed is intentionally **not** implemented
  (ToS + fragility). Use manual import for those.
- Email classification is heuristic (keyword-based) — review status changes.
