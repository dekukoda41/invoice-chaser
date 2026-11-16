# Invoice Chaser — Stop Chasing Clients, Get Paid Automatically

**Automated payment follow-ups for freelancers.** Add your invoices once. We send polite, escalating email reminders on day 1, 7, and 14 past due — so you never write another awkward follow-up again.

[Live Site](https://dekukoda41.github.io/invoice-chaser/) · [Report Bug](https://github.com/dekukoda41/invoice-chaser/issues) · [Request Feature](https://github.com/dekukoda41/invoice-chaser/issues)

---

## The Problem (Validated by Data)

| Metric | Value | Source |
|--------|-------|--------|
| Freelancers paid late at least sometimes | **85%** | Remote 2025 Contractor Report |
| Freelance invoices paid 1+ day late | **29%** | Bonsai, 100k+ freelancers |
| Freelancers ghosted after work started | **26.6%** | Leapers 2025 |
| Avg. amount owed per business (unpaid) | **$17,700** | QuickBooks 2026 |
| Hours/year chasing invoices | **86 hrs** | UK Office of the Small Business Commissioner |
| Freelancers worldwide | **~1.57B** | World Bank / DemandSage 2026 |

**You're not bad at collections — the system is broken.**

Existing tools (Bonsai $29/mo, HoneyBook $49/mo, FreshBooks $43/mo) are full business suites that charge $300–$600/year just to send follow-up emails. Invoice Chaser does one thing well: automated payment chasing, free to start.

---

## The Solution

**Invoice Chaser sits beside your current invoicing** — QuickBooks, Wave, Stripe, Excel — whatever you use. You add your invoices, and we send polite, escalating email reminders automatically.

- **Day 1 past due:** Friendly nudge ("just flagging this slipped through")
- **Day 7 past due:** Firmer but professional ("can you share an ETA?")
- **Day 14 past due:** Final notice ("need to resolve this soon")

Reminders stop the moment you mark an invoice paid. No more embarrassing follow-ups to clients who already paid.

---

## Pricing

| Plan | Price | Best For |
|------|-------|----------|
| **Free** | $0/mo | Up to 10 active invoices, email reminders, 3-touch escalation |
| **Pro** | $15/mo | Unlimited invoices, WhatsApp reminders, custom templates, priority support |
| **Team** | $49/mo | Agencies, up to 5 seats, multi-company profiles |

One recovered invoice pays for Pro for a year.

[Upgrade to Pro](https://buy.stripe.com/test_4gw28n6s81R94e8aAA)

---

## Tech Stack (All Free Tiers)

| Layer | Tool | Free Tier |
|-------|------|-----------|
| Hosting | GitHub Pages | Unlimited static sites |
| Frontend | Vanilla JS + Tailwind CSS | CDN |
| Database + Auth | Supabase | 500 MB, 50k MAU |
| Email | Resend | 100 emails/day |
| Cron / Scheduling | GitHub Actions | Unlimited for public repos |
| Payments | Stripe Checkout | Pay only when you sell |

---

## Quick Start (5 Minutes)

### 1. Deploy to GitHub Pages

```bash
# Clone this repo
git clone https://github.com/dekukoda41/invoice-chaser.git
cd invoice-chaser

# Or fork it on GitHub, then clone your fork
```

Push to GitHub, then go to **Settings → Pages** and select `main` branch as source. Your site is live at `https://yourusername.github.io/invoice-chaser`.

### 2. Set Up Supabase (Free)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `db/schema.sql`
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`

### 3. Configure Frontend

Edit `index.html` and replace at the top of the `<script>` block:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Set Up Daily Cron (GitHub Actions)

In your repo **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key (Settings → API) |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |

The workflow `.github/workflows/cron.yml` runs every day at 09:00 UTC, finds overdue invoices, and sends reminder emails via Resend.

### 5. Send Your First Reminder

1. Sign up at your GitHub Pages URL
2. Add a client and an invoice (set a past due date for testing)
3. The next daily cron run sends the first reminder automatically

---

## Project Structure

```
invoice-chaser/
├── index.html           # Landing page + auth + dashboard (GitHub Pages)
├── style.css            # Custom styles
├── app.js               # Frontend logic (Supabase, auth, CRUD, plan limits)
├── db/
│   └── schema.sql       # Supabase database schema with RLS
├── scripts/
│   └── send-reminders.js # Node.js cron: queries Supabase, sends via Resend
├── .github/
│   └── workflows/
│       └── cron.yml     # Daily scheduled workflow (09:00 UTC)
├── package.json         # Node.js deps for cron script
└── README.md
```

---

## Roadmap

- **v1 (now):** Manual invoice entry, auto 3-touch email sequence, dashboard, Supabase auth, Free/Pro plans
- **v2:** CSV import from QuickBooks/Wave/Excel, WhatsApp reminders, custom email templates per client
- **v3:** Stripe webhook integration (auto-stop when paid), mobile app, team invoicing

---

## License

MIT — Build on it, fork it, ship it.

---

**Made with ❤️ for freelancers who hate admin.** Stop chasing. Start getting paid.