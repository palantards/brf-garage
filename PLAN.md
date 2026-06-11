# BRF Garage — MVP Plan

## Done ✅

- [x] Project setup (Next.js, Neon, Resend, Auth.js, shadcn)
- [x] Invite-based auth (invite token → set password → login)
- [x] Admin: invite residents, residents table with status
- [x] Admin: withdraw pending invites, remove residents
- [x] Dashboard with role-based cards
- [x] Garage map — full flow (see below)
- [x] Queue join/leave + position display
- [x] Spot management + upcoming availability
- [x] Spot preferences (queue member interest + admin interest count)
- [x] Offer flow (trigger, accept/decline, auto-cascade, cron expiry)
- [x] Vehicle types + EV spot priority (MC hard filter, EV-first soft priority)
- [x] Admin settings page (offer deadline, EV priority toggle)
- [x] Dark mode (dashboard + landing page)
- [x] Landing page (public, inline SVG hero, CSP-compliant)

---

## Prio 1 — Garage Map 🗺️ ✅

**Status:** Complete.

**Flow:**

1. Admin uploads floor plan image via drag-and-drop modal → stored as private Vercel Blob → `map_status = pending`
2. Ops notified by email → runs `npx tsx scripts/process-map.ts <assocId>` locally → downloads image, runs `detect_spots.py` (EasyOCR), upserts spots → `map_status = review`
3. Admin opens editor → drag/resize spots, label them → clicks "Publicera karta" → `map_status = published`
4. Map visible to all users with color-coded spots (free/occupied/offered)

**Key files:**

- `scripts/process-map.ts` — end-to-end pipeline (download + OCR + import)
- `scripts/detect_spots.py` — EasyOCR-based spot detection
- `src/app/dashboard/map/` — map page, upload modal, delete button, GarageMap component
- `src/app/dashboard/map/editor/` — spot editor (draw, drag, resize, label, publish)
- `src/app/api/admin/map/` — PUT (save/publish spots), image POST/DELETE
- `src/app/api/map/image/` — private blob proxy

---

## Prio 2 — Queue Join/Leave + Position ✅

**Goal:** Residents can join/leave the queue and see their current position.

**Tasks:**

- [x] Resident: join queue (insert into `queue_entries`)
- [x] Resident: leave queue (set `left_at`) — requires inline confirmation
- [x] Resident: see queue position (ROW_NUMBER window function)
- [x] Admin: view full queue (ordered list) at `/dashboard/queue`
- [x] Wire up "Min köplats" card on dashboard with real data

---

## Prio 3 — Spot Management + Upcoming Availability (Admin) ✅

**Goal:** Admin can manage spots and record when an assigned spot is being vacated
(3-month notice period / uppsägningstid), making it visible as "upcoming" to queue members.

**Tasks:**

- [x] Admin: list all spots with current status
- [x] Admin: add spot (identifier, description)
- [x] Admin: toggle spot availability (e.g. spot under renovation)
- [x] Admin: delete spot
- [x] Add `ending_at` to `spot_assignments` — admin sets this when resident gives notice
- [x] Map: show spots with a future `ending_at` as "upcoming" (distinct color)
- [x] Residents in queue: can see which spots are upcoming (identifier + approx. free date)
- [x] Spots table: surface "Ej placerad på karta →" link for manually added spots missing map coordinates
- [x] Map editor: show unplaced spots as clickable chips so admin knows what to draw and can pre-fill the label

---

## Prio 4 — Spot Preferences ✅

**Goal:** Queue members can express interest in specific spots. When a spot becomes free,
the offer goes to the highest queue position among those who want it — falling back to
normal FIFO if nobody expressed a preference.

**Why:** In practice admins show upcoming spots to queue members who then choose to wait
for a specific one rather than taking whatever comes first. This formalises that flow.

**Data model:**

```sql
CREATE TABLE spot_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID REFERENCES associations(id),
  user_id        UUID REFERENCES users(id),
  spot_id        UUID REFERENCES spots(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, spot_id)
);
```

**Tasks:**

- [x] DB migration: create `spot_preferences` table (`006_spot_preferences.sql`)
- [x] Resident: view upcoming spots + toggle preference (want / don't want) — QueueCard upcoming table with optimistic toggle
- [x] API: POST/DELETE `/api/queue/preferences` — idempotent via `ON CONFLICT DO NOTHING`, scoped DELETE
- [x] Admin: see interest count per spot in spots table (`preference_count` column)
- [x] Offer trigger: prefer highest-queue-position preferring the spot; fall back to FIFO (implemented in Prio 5, enhanced with vehicle type filtering)

---

## Prio 5 — Offer Flow ✅

**Goal:** When a spot becomes free, an offer is automatically sent to the right person
in queue (respecting preferences from Prio 4). They have a deadline to accept.
If declined or expired → next in queue.

**Tasks:**

- [x] Core logic: `src/lib/offers.ts` — findNextEligible (prefers spot preferences, falls back to FIFO), createOfferForSpot, acceptOffer, declineOffer, expireStaleOffers
- [x] Configurable deadline: `offer_deadline_hours` column on associations (default 48h) — migration 007
- [x] Admin: trigger offer from spots table (`POST /api/admin/offers`) — send button on free spots
- [x] Auto-trigger: offer sent immediately when admin sets `ending_at` (notice date) on an assignment
- [x] Resident: self-service resign (`POST /api/spots/resign`) — sets 3-month notice, auto-triggers offer
- [x] Resident: dashboard shows `SpotCard` (with resign button) when they have an assignment, `QueueCard` when they don't
- [x] Resident: view active offer with live countdown (`OfferCard` on dashboard)
- [x] Resident: accept offer → creates `spot_assignment` (or defers if spot still occupied), removes from queue, cleans up preferences
- [x] Resident: decline offer → with confirmation → offer cascades to next in queue
- [x] Email notification sent immediately when offer is created (via Resend)
- [x] Cron job: `GET /api/cron/expire-offers` — daily at 06:00 UTC, expires stale offers + ends assignments past notice date + creates handover assignments
- [x] Audit log: `spot.resigned`, `offer.created`, `offer.accepted`, `offer.declined`, `offer.expired`, `spot.assignment_ended`, `spot.assigned`

---

## Prio 6 — Email Notifications ✅

**Goal:** Residents get emails for key events.

**Tasks:**

- [x] Email: spot offer notification (sent immediately via Resend with deadline + dashboard link)
- [x] Email: offer reminder (24h before deadline)
- [x] Email: offer expired notification
- [x] Email: queue join confirmation
- [x] Email: assignment confirmation

---

## Prio 7 — Audit Log View (Admin) ✅

**Goal:** Admin can see a full history of queue events for transparency.

**Tasks:**

- [x] Admin: audit log page (paginated table)
- [x] Filter by event type
- [x] Wire up "Händelselogg" card on dashboard

---

## Prio 8 — Security Hardening ✅

**Tasks:**

- [x] Add Content-Security-Policy headers in `next.config.ts` before go-live
- [x] Review all API routes for missing auth checks
- [x] Ensure rate limiting on auth endpoints (login, invite)

---

## Prio 8.5 — Vehicle Types + Admin Settings ✅

**Goal:** MC spots only offered to MC owners, EV spots prioritise EV owners (configurable).

**Tasks:**

- [x] DB: `users.vehicle_type` ('car' | 'mc' | 'electric_car'), `associations.ev_priority_only` (boolean)
- [x] Spots: 'electric' added as `map_type` option (alongside 'car', 'mc')
- [x] Offer logic: MC hard filter, EV-first soft priority with fallback
- [x] Resident: vehicle type selector at queue join + changeable while in queue
- [x] Admin: settings page (`/dashboard/settings`) — offer deadline + EV priority toggle
- [x] Dark mode: landing page converted to CSS custom properties

---

## Prio 8.6 — Landing Page ✅

**Tasks:**

- [x] Public landing page (middleware allows `/` without auth)
- [x] Inline SVG hero illustration (no external images, CSP-compliant)
- [x] Dark mode support via CSS variables
- [x] Blob proxy: forward Content-Length, stale-while-revalidate caching

---

---

# CRM Pivot (2026-06-11)

After meeting with BRF Krickan's styrelse, the product is pivoting to an **admin-only CRM**.
Residents interact via email; admins manage everything in-app. The existing self-service
features are kept — each association will eventually choose its mode (`admin_only` or `self_service`).

Source: `FEEDBACK.md`

---

## Prio 10 — Application Form Flow 📋

**Goal:** Admin creates an application for a resident, system emails them a form link,
resident fills it, admin reviews and approves (add to queue or assign spot) or rejects.

**Database:**
- New `applications` table (token-protected, full lifecycle tracking)
- Add `agreement_type` column on `spot_assignments` (permanent / temporary)

**New pages:**
- `/apply/[token]` — public form (no login, token-protected)
- `/dashboard/applications` — admin list + create sheet
- `/dashboard/applications/[id]` — admin review + approve/reject

**Application statuses:** `form_sent` → `submitted` → `approved` / `rejected` / `cancelled`

**Approve actions:** "Lägg till i kö" (creates user + queue entry) or "Tilldela plats direkt" (creates user + spot assignment)

**Emails:** form link (to resident), submitted notification (to admin), decision (to resident)

**Audit events:** `application.created`, `application.submitted`, `application.approved`, `application.rejected`

---

## Prio 11 — Resignation Form Flow

**Goal:** Same pattern as applications but for leaving. Admin sends resignation form link,
resident confirms, notice period starts based on agreement type.

- Regular agreements: 3 month notice
- Temporary agreements: 1 month notice
- New `resignations` table or similar
- `/resign/[token]` public form

---

## Prio 12 — Association Mode Config

**Goal:** Per-association mode flag so some BRFs use admin-only CRM while others keep
resident self-service.

- Add `mode` column to `associations` (`admin_only` | `self_service`)
- Gate resident-facing features (login, queue join, dashboard) per mode
- Default to `admin_only` for new associations

---

## Prio 13 — Boendelista Import

**Goal:** Admin uploads a resident list (CSV/Excel) to bulk-create resident records
and map them to spots.

- Upload page with column mapping UI
- Create/update user records in bulk
- Optionally assign spots during import

---

## Prio 14 — GDPR Compliance

**Must-have** per customer feedback.

- Data retention policies
- Right-to-be-forgotten (anonymize/delete resident data)
- Export personal data on request
- Consent tracking

---

## Prio 15 — 2FA for Admin Login

- TOTP-based 2FA (authenticator app)
- Required for admin role
- Setup flow in settings page

---

## Prio 16 — Custom Domains

**Goal:** Each BRF serves the app under their own path (e.g. `brfkrickan.se/garage`).

- Multi-domain routing in middleware
- Map domain → association_id
- Vercel custom domains or reverse proxy setup

---

## Prio 17 — E-Sign Integration (nice-to-have)

- Free e-signature via elektronisksignering.se or similar
- Attach signed agreements to spot assignments
- Not a blocker for launch

---

## Production Deploy

- [ ] Set up Vercel project, connect repo
- [ ] Configure production env vars
- [ ] Verify Resend domain for production email
- [ ] Set up Neon production branch (or keep single DB for now)
- [ ] Test full flow end-to-end in production

---

## Deferred (post-MVP)

- BankID authentication
- Self-service association onboarding
- Fully automated garage map generation (host detect_spots.py on Modal or similar — currently ops-assisted)
- Waiting list priority rules (e.g. seniority, disability)
- Resident portal (view assignment history)
- Multi-spot households
- Billing / subscription management
