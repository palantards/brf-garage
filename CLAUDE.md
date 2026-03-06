# BRF Garage – Claude Code Instructions

## Project Overview
SaaS system for managing garage/parking queues for Swedish bostadsrättsföreningar (housing associations). Associations pay a monthly fee to manage queues, allocations, and resident communication.

## Tech Stack
- **Framework**: Next.js (App Router, TypeScript)
- **Hosting**: Vercel
- **Database**: PostgreSQL via Neon — raw SQL only, no ORM
- **SQL client**: `postgres` (postgres.js)
- **Email**: Resend
- **Auth**: Auth.js v5 (`next-auth@beta`) — invite-based email auth
- **Styling**: Tailwind CSS

## Git
- Repo: `https://github.com/palantards/brf-garage`
- Main branch: `master`

## Key Conventions

### Database
- Never use an ORM. Write raw SQL using `postgres.js`.
- All tables have an `association_id` column for multi-tenancy.
- Use PostgreSQL transactions for any queue operations.
- All mutations that affect queue state must write to the `audit_log` table.
- DB client is initialized in `src/db/client.ts`.
- Schema is in `src/db/schema.sql`.
- Migration files go in `src/db/migrations/`.

### Auth
- Invite-based: admin adds resident emails, residents receive a magic link / set password.
- Auth.js config is in `src/lib/auth.ts`.
- Protect routes via middleware (`middleware.ts` at root).

### API Routes
- All API routes live under `src/app/api/`.
- Admin routes are under `src/app/api/admin/` and check for `admin` role.

### Environment Variables
Required in `.env.local`:
```
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
RESEND_API_KEY=
```

## Business Rules
- Queue position is determined by join timestamp — FIFO, no exceptions.
- When a spot becomes free, an offer is sent to the first person in queue.
- Offer has a deadline (configurable per association, default 48h).
- If declined or expired → automatically offer to next in queue.
- All queue events are logged to `audit_log` for transparency.

## MVP Feature Scope
1. Queue join/leave + position display (residents)
2. Automated offer → accept/decline flow with deadlines
3. Email notifications (Resend)
4. Admin dashboard: manage residents, view queue, assign spots, view audit log
5. Audit log (immutable append-only)

**Not in MVP**: BankID, garage map, self-service association onboarding.
