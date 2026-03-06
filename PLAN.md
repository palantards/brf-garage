# BRF Garage — MVP Plan

## Done ✅
- [x] Project setup (Next.js, Neon, Resend, Auth.js, shadcn)
- [x] Invite-based auth (invite token → set password → login)
- [x] Admin: invite residents, residents table with status
- [x] Admin: withdraw pending invites, remove residents
- [x] Dashboard with role-based cards

---

## Prio 1 — Garage Map 🗺️

**Goal:** Visual overview of all spots — which are free, occupied, or offered.
Admin can click a spot to assign it or mark it as free.

**Approach — manual now, auto-ready later:**

Spots are stored with optional canvas coordinates in the DB:
- `map_x`, `map_y` — position as percentage of the map image (0–100)
- `map_width`, `map_height` — size as percentage
- `map_image_url` on `associations` table — the background garage image

Rendering: SVG overlay on top of the garage image. Each spot = a colored rectangle.
Colors: green (free), red (occupied), yellow (offered/pending).

Manual setup: admin uploads a garage image, then places spots by dragging them
onto the image (simple drag-to-position editor).

**Future automation path (no code changes needed to the map renderer):**
Upload garage image → AI/OCR detects parking spot outlines → auto-fills
`map_x/y/width/height` for each spot. The renderer is identical; only the
data entry changes.

**Tasks:**
- [ ] DB migration: add `map_x`, `map_y`, `map_width`, `map_height` to `spots`
- [ ] DB migration: add `map_image_url` to `associations`
- [ ] Admin: upload garage image (Vercel Blob)
- [ ] Admin: spot placement editor (drag spots onto image, save coordinates)
- [ ] Map view component (SVG overlay, color-coded by status)
- [ ] Embed map on dashboard + admin queue view

---

## Prio 2 — Queue Join/Leave + Position

**Goal:** Residents can join/leave the queue and see their current position.

**Tasks:**
- [ ] Resident: join queue (insert into `queue_entries`)
- [ ] Resident: leave queue (set `left_at`)
- [ ] Resident: see queue position (count entries with earlier `joined_at`)
- [ ] Admin: view full queue (ordered list)
- [ ] Wire up "Min köplats" card on dashboard with real data

---

## Prio 3 — Spot Management (Admin)

**Goal:** Admin can create/edit/delete garage spots and mark them available/unavailable.

**Tasks:**
- [ ] Admin: list all spots
- [ ] Admin: add spot (identifier, description, coordinates if map is set up)
- [ ] Admin: toggle spot availability (e.g. spot under renovation)
- [ ] Admin: delete spot

---

## Prio 4 — Offer Flow

**Goal:** When a spot becomes free, an offer is automatically sent to #1 in queue.
They have a deadline to accept. If declined or expired → next in queue.

**Tasks:**
- [ ] Trigger: when spot marked free → find #1 in queue → create `spot_offer`
- [ ] Resident: view active offer (with deadline countdown)
- [ ] Resident: accept offer → creates `spot_assignment`, removes from queue
- [ ] Resident: decline offer → offer marked declined → triggers next in queue
- [ ] Cron job / background task: expire offers past deadline → trigger next
- [ ] Admin: manually trigger offer (override)

---

## Prio 5 — Email Notifications

**Goal:** Residents get emails for key events.

**Tasks:**
- [ ] Email: spot offer (with accept/decline links)
- [ ] Email: offer reminder (24h before deadline)
- [ ] Email: offer expired notification
- [ ] Email: queue join confirmation
- [ ] Email: assignment confirmation

---

## Prio 6 — Audit Log View (Admin)

**Goal:** Admin can see a full history of queue events for transparency.

**Tasks:**
- [ ] Admin: audit log page (paginated table)
- [ ] Filter by event type
- [ ] Wire up "Händelselogg" card on dashboard

---

## Prio 7 — Production Deploy

**Tasks:**
- [ ] Set up Vercel project, connect repo
- [ ] Configure production env vars
- [ ] Verify Resend domain for production email
- [ ] Set up Neon production branch (or keep single DB for now)
- [ ] Test full flow end-to-end in production

---

## Deferred (post-MVP)
- BankID authentication
- Self-service association onboarding
- Automated garage map generation (AI/OCR)
- Garage map auto-generation from uploaded floor plan
- Waiting list priority rules (e.g. seniority, disability)
- Resident portal (view assignment history)
- Multi-spot households
- Billing / subscription management
