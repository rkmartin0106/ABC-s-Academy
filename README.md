# ABC's Academy

AI-powered English learning ecosystem — Next.js 14, TypeScript, Tailwind CSS, Supabase, Prisma.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A Telegram bot (via [@BotFather](https://t.me/botfather))

---

## 1. Environment Setup

Copy `.env.local` and fill in your values:

```bash
cp .env.local .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection Pooling (port 6543) |
| `DIRECT_URL` | Supabase → Project Settings → Database → Direct connection (port 5432) |
| `TELEGRAM_BOT_TOKEN` | From @BotFather on Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string you choose (used to verify webhook requests) |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Run Supabase Migrations

Run the SQL files in `supabase/migrations/` in order via the **Supabase SQL Editor**:

1. `001_initial_schema.sql` — creates all tables and enums
2. `002_rls_policies.sql` — sets up Row Level Security
3. `003_auth_trigger.sql` — auto-creates a `users` row on signup

> **Tip:** Go to your Supabase project → SQL Editor → paste each file and run.

---

## 4. Generate Prisma Client

```bash
npm run db:generate
```

To push the schema to your database (alternative to SQL migrations):

```bash
npm run db:push
```

---

## 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 6. Set the Telegram Webhook

After deploying to Vercel (or when using a tunnel like [ngrok](https://ngrok.com) locally), register your webhook with Telegram:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.vercel.app/api/telegram" \
  -d "secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>"
```

Verify it's registered:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## 7. Create the First Teacher Account

1. Go to your Supabase project → Authentication → Users → **Invite user**
2. After the user signs up, run this in the SQL Editor to promote them to teacher:

```sql
update users set role = 'teacher' where email = 'teacher@example.com';
```

---

## Project Structure

```
/app
  /admin              ← Teacher dashboard (role: teacher)
  /student            ← Student portal (role: student)
  /api/telegram       ← Telegram webhook endpoint
  /api/auth           ← Auth helpers (sign-out)
  /(auth)/login       ← Shared login page

/components
  /admin              ← Teacher UI components
  /student            ← Student UI components
  /shared             ← Shared components

/lib
  supabase.ts         ← Supabase server + browser clients
  telegram.ts         ← Telegram bot helpers
  auth.ts             ← Auth utilities and role guards

/types
  index.ts            ← All shared TypeScript types

/prisma
  schema.prisma       ← Database schema

/supabase/migrations  ← SQL migration files
```

---

## Deployment

This project is configured for [Vercel](https://vercel.com). Push to `main` and Vercel auto-deploys.

Add all `.env.local` variables to your Vercel project's **Environment Variables** settings.
