# Invoice Chaser — Automated Payment Follow-Ups for Freelancers

Stop chasing clients. Get paid on overdue invoices automatically.

A lightweight, free-to-start micro SaaS built for solo freelancers who send 5–20 invoices a month and hate the awkwardness of manual payment chasing.

## The Problem (Validated by Data)

| Metric | Value | Source |
|--------|-------|--------|
| Freelancers paid late at least sometimes | 85% | Remote 2025 Contractor Management Report |
| Freelance invoices paid 1+ day late | 29% | Bonsai, 100,000+ freelancers |
| Freelancers ghosted after work started | 26.6% | Leapers 2025 |
| Avg. amount owed per business (unpaid invoices) | $17,700 | QuickBooks 2026 |
| Hours/year spent chasing invoices | 86 | UK Office of the Small Business Commissioner |
| Freelancers worldwide | ~1.57B | World Bank / DemandSage 2026 |

Existing tools (Bonsai $29/mo, HoneyBook $49/mo, FreshBooks $43/mo) are full business suites. Freelancers who just need follow-ups are overcharged and over-featured.

## The Solution

Invoice Chaser sits **beside** your current invoicing (QuickBooks, Wave, Stripe, Excel — whatever you use). You add your invoices, and it sends polite, escalating email reminders on day 1, 7, and 14 past due — automatically. No client portal, no payment processing, no $50/month bloat. Just follow-ups that work.

## Tech Stack (All Free Tiers)

| Layer | Tool | Free Tier |
|-------|------|-----------|
| Hosting | GitHub Pages | Unlimited static sites |
| Frontend | Vanilla JS + Tailwind CSS | CDN |
| Database + Auth | Supabase | 500 MB, 50k MAU |
| Email | Resend | 100 emails/day |
| Cron / Scheduling | GitHub Actions | Unlimited for public repos |

## Quick Start

### 1. Fork or clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/invoice-chaser.git
cd invoice-chaser
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in `db/schema.sql` in the Supabase SQL Editor
3. Copy your **Project URL** and **anon public key** from Settings → API

### 3. Configure GitHub Pages

1. Go to your repo Settings → Pages
2. Source: Deploy from a branch → `main` → `/ (root)`
3. Your site is live at `https://YOUR_USERNAME.github.io/invoice-chaser`

### 4. Add environment variables to the frontend

Create `config.js` (not committed) or edit `index.html` and replace:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 5. Set up the daily cron (GitHub Actions)

Add these secrets in your repo Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (Settings → API) |
| `RESEND_API_KEY` | Resend API key (resend.com) |

The workflow `.github/workflows/cron.yml` runs every day at 09:00 UTC, finds overdue invoices, and sends reminder emails via Resend.

### 6. Send your first reminder

1. Sign up at your GitHub Pages URL
2. Add a client and an invoice (past due date for testing)
3. The next daily cron run will send the first reminder automatically

## Project Structure

```
invoice-chaser/
├── index.html           # Single-page app (landing + dashboard)
├── style.css            # Custom styles
├── app.js               # Application logic (Supabase client, auth, CRUD)
├── db/
│   └── schema.sql       # Supabase database schema
├── scripts/
│   └── send-reminders.js # GitHub Actions cron script
├── .github/
│   └── workflows/
│       └── cron.yml     # Daily scheduled workflow
└── README.md
```

## Roadmap

- **v1 (now):** Manual invoice entry, auto 3-touch email sequence (day 1/7/14), dashboard, Supabase auth
- **v2:** CSV import from QuickBooks/Wave/Excel, WhatsApp reminders, custom email templates per client
- **v3:** Stripe/PayPal webhook integration (auto-stop reminders when paid), mobile app

## License

MIT — Build on it, fork it, ship it.