@AGENTS.md

# Boat schedule — project notes

Shared calendar app for three boat owners (see `README.md` for the full story and setup).

## Stack

- Next.js 16 (App Router, **Turbopack**, React 19) + TypeScript
- Material UI v7 + `react-hook-form`
- Prisma + SQLite (local dev) / Postgres (production)
- NextAuth v5 with Google + a dev-only Credentials provider
- FullCalendar for the calendar view

## Local dev

```bash
yarn dev           # starts on http://localhost:3000
yarn tsc           # type check
yarn lint          # ESLint
yarn db:migrate    # Prisma migrate dev
yarn db:seed       # seed 3 owners + current-year rotation + fixed-week bookings
```

The dev sign-in page shows a "Sign in as alice@example.com" (and bob/carol) button shortcut when `NODE_ENV !== 'production'`. No Google OAuth setup needed for local testing.

## Verification requirement — use Chrome DevTools MCP

**Never claim a UI change works based only on `yarn tsc` or `yarn lint`.** Those verify the code compiles, not that the page renders.

After any change that touches a route, layout, component, or data-fetching code, verify by driving a real browser through the `chrome-devtools-mcp` skill:

1. Start (or verify) `yarn dev` is running.
2. `chrome-devtools__new_page` or `navigate_page` to the affected route(s).
3. `chrome-devtools__take_snapshot` — confirm the expected structure is present (headings, buttons, data).
4. `chrome-devtools__list_console_messages` with `types: ["error", "warn"]` — there must be no errors.
5. For flows with interaction (request, approve, cancel), click through with `chrome-devtools__click` and re-snapshot.
6. If touching visuals, `chrome-devtools__take_screenshot` and inspect.

Do this for both the "happy path" and at least one edge case relevant to the change. If something is broken, fix it before reporting success.

## Next.js 16 gotchas that bit us

- **No `middleware.ts`** — the file is now called `proxy.ts` and must export `proxy` (or default). We use `export { auth as proxy } from '@/lib/auth'`.
- **No function-component props across server/client boundary** — a server component cannot pass `component={Link}` to a client component like MUI `Button`. Put the navigation inside a `'use client'` component (see `components/NavBar.tsx`).
- **Dynamic route params are async** — route handlers and page components receive `context: { params: Promise<{ ... }> }`. Always `await context.params`.
- **MUI v7 moved `InputLabelProps`** — use `slotProps={{ inputLabel: { shrink: true } }}` instead.
- **MUI Stack props** like `alignItems`, `justifyContent`, `flexWrap` now live inside `sx`, not as direct props.

## Source of truth

- App DB (`prisma/dev.db` locally) is the source of truth for all bookings, approvals, and maintenance.
- Google Calendar is a one-way **sync target** — confirmed bookings get written there for visibility in owners' normal calendars. If the gcal env vars are unset, writes are skipped with a console warning (useful in dev).
- Email sends are skipped with a console log when `RESEND_API_KEY` is unset.

## Style (from team config)

- No semicolons, single quotes, 2-space indent (enforced by ESLint).
- Prefer `const`, `async/await`, named exports.
- Prefer lodash over native array methods when it's clearer (e.g., `_.map(users, 'name')`).
- MUI components for UI; `styled-components` only if MUI can't cover it.
- `react-hook-form` for forms.
- Use `luxon` for dates. Don't reach for `Date` arithmetic directly.
