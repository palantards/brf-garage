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
- **File storage**: Vercel Blob (private access) — floor plan images stored at `garage-maps/{assocId}/floorplan.{ext}`

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
- Migration files go in `src/db/migrations/` (numbered sequentially, e.g. `001_`, `002_`).
- **Every database change (ALTER TABLE, CREATE TABLE, etc.) must be done in two places: run it on Neon AND add a migration file. Never do one without the other.**

### UI
- Use shadcn/ui for all components. The latest shadcn uses Base UI as its primitive layer internally.
- Always add `type="submit"` explicitly to shadcn `Button` components inside forms — Base UI defaults to `type="button"`, which prevents form submission.

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
RESEND_FROM=
BLOB_READ_WRITE_TOKEN=
OPS_EMAIL=           # where map upload notifications are sent
```

## Business Rules
- Queue position is determined by join timestamp — FIFO, no exceptions.
- When a spot becomes free, an offer is sent to the first person in queue.
- Offer has a deadline (configurable per association, default 48h).
- If declined or expired → automatically offer to next in queue.
- All queue events are logged to `audit_log` for transparency.

### Garage Map
`map_status` lifecycle on the `associations` table:
- `unconfigured` → admin uploads floor plan image → `pending`
- Ops runs `npx tsx scripts/process-map.ts <assocId>` locally → `review`
- Admin opens editor, adjusts spots, clicks "Publicera karta" → `published`

Floor plan images are private blobs. Serve them via `/api/map/image` (proxies with token), never expose the raw blob URL in the UI.

## MVP Feature Scope
1. Garage map — upload, process, review, publish ✅
2. Queue join/leave + position display (residents)
3. Automated offer → accept/decline flow with deadlines
4. Email notifications (Resend)
5. Admin dashboard: manage residents, view queue, assign spots, view audit log
6. Audit log (immutable append-only)

**Not in MVP**: BankID, self-service association onboarding.
