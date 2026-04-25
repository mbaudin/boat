# Boat schedule

A private shared calendar for three boat owners. Each owner gets one guaranteed week per year (rotating year-over-year). Additional days can be requested and require unanimous approval from the other two owners. Confirmed bookings sync one-way to a shared Google Calendar.

## Features

- Calendar view with fixed weeks (per-owner color) and pending/confirmed extra bookings
- Request extra days, with email notifications and approve/reject flow
- Requests that overlap another owner's fixed week are allowed and cleanly split the fixed week on approval
- Maintenance / blocked days
- One-way sync of confirmed bookings to a shared Google Calendar
- Per-owner ICS feed URL (subscribe from any calendar app)
- Usage balance view (days confirmed vs. 7-day fair share, including pending)
- Audit log of all actions
- Year-rollover screen that confirms and writes the next year's rotation

## Tech

Next.js (App Router) + TypeScript + Material UI, Prisma on Postgres, NextAuth with Google, Resend for email, `googleapis` for calendar writes, FullCalendar for the calendar UI.

## One-time setup

1. **Postgres** — create a database (Neon / Supabase / local). Copy the connection string into `DATABASE_URL`.
2. **Google Cloud project**
   - Enable the Google Calendar API.
   - Create OAuth client credentials for NextAuth sign-in. Authorized redirect URI: `<APP_BASE_URL>/api/auth/callback/google`.
   - Create **either** a service account (recommended) **or** obtain an OAuth refresh token for calendar writes.
3. **Shared Google Calendar** — create a new calendar, share it with the service account email (or the owner whose OAuth refresh token you used) with **Make changes to events** permission. Copy the calendar ID into `GCAL_CALENDAR_ID`.
4. **Resend** — sign up, get an API key. Either verify a custom domain or use `onboarding@resend.dev` for development.
5. **Env** — copy `.env.example` to `.env.local` and fill in the values.
6. **Install + migrate + seed**

   ```bash
   yarn install
   yarn db:migrate
   yarn db:seed
   ```

   The seed creates three owner rows from `OWNER_EMAILS` (in order) and the current year's rotation.

7. **Run**

   ```bash
   yarn dev
   ```

   Visit http://localhost:3000 and sign in with one of the allowlisted Google accounts.

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo into Vercel.
3. Set all env vars from `.env.example` in the Vercel project settings. Set `APP_BASE_URL` and `NEXTAUTH_URL` to your production URL.
4. Vercel's build will run `prisma generate` via `postinstall`. Run `yarn db:deploy` once (locally or via a one-off command) to apply migrations to the production database.
5. Update the Google OAuth authorized redirect URI to include the production URL.

## Scripts

- `yarn dev` — dev server
- `yarn build` / `yarn start` — production
- `yarn lint` / `yarn lint:fix` — ESLint
- `yarn tsc` — type check
- `yarn db:migrate` — Prisma migrate dev
- `yarn db:deploy` — Prisma migrate deploy (production)
- `yarn db:seed` — seed owners + current-year rotation

## Configuring the rotation

Edit `lib/rotation.ts` to pick which weeks are the "prime" weeks (default: ISO weeks 27/28/29). Then on the **Settings** page, click "Set up year YYYY" to write the fixed-week bookings for that year. The rotation offset advances by 1 owner per year, so over three years each owner cycles through each prime week.
# boat
