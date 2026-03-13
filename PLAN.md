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

## Prio 4 — Spot Preferences

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
- [ ] DB migration: create `spot_preferences` table
- [ ] Resident: view upcoming spots + toggle preference (want / don't want)
- [ ] Resident: see their own preference list
- [ ] Offer trigger: prefer highest-queue-position preferring the spot; fall back to FIFO
- [ ] Admin: see who has expressed interest in each spot

---

## Prio 5 — Offer Flow

**Goal:** When a spot becomes free, an offer is automatically sent to the right person
in queue (respecting preferences from Prio 4). They have a deadline to accept.
If declined or expired → next in queue.

**Tasks:**
- [ ] Trigger: spot marked free → find next eligible person → create `spot_offer`
- [ ] Resident: view active offer (with deadline countdown)
- [ ] Resident: accept offer → creates `spot_assignment`, removes from queue
- [ ] Resident: decline offer → offer marked declined → triggers next in queue
- [ ] Cron job / background task: expire offers past deadline → trigger next
- [ ] Admin: manually trigger offer (override)

---

## Prio 6 — Email Notifications

**Goal:** Residents get emails for key events.

**Tasks:**
- [ ] Email: spot offer (with accept/decline links)
- [ ] Email: offer reminder (24h before deadline)
- [ ] Email: offer expired notification
- [ ] Email: queue join confirmation
- [ ] Email: assignment confirmation

---

## Prio 7 — Audit Log View (Admin)

**Goal:** Admin can see a full history of queue events for transparency.

**Tasks:**
- [ ] Admin: audit log page (paginated table)
- [ ] Filter by event type
- [ ] Wire up "Händelselogg" card on dashboard

---

## Prio 8 — Security Hardening

**Tasks:**
- [ ] Add Content-Security-Policy headers in `next.config.ts` before go-live
- [ ] Review all API routes for missing auth checks
- [ ] Ensure rate limiting on auth endpoints (login, invite)

---

## Prio 9 — Production Deploy

**Tasks:**
- [ ] Set up Vercel project, connect repo
- [ ] Configure production env vars
- [ ] Verify Resend domain for production email
- [ ] Set up Neon production branch (or keep single DB for now)
- [ ] Test full flow end-to-end in production

---

## Prio 10 — Landing Page

**Goal:** A polished public-facing `/` page that clearly communicates what BRF Garage is,
who it's for, and how to get started — replacing the current placeholder.

**Tasks:**
- [ ] Hero section: headline, subheadline, CTA button ("Logga in" / "Kom igång")
- [ ] Feature highlights: queue management, garage map, offer flow, audit log
- [ ] How it works: 3-step flow (admin sets up → residents join queue → offers sent automatically)
- [ ] Pricing / target audience blurb (bostadsrättsföreningar)
- [ ] Footer with contact / copyright

---

## Deferred (post-MVP)
- BankID authentication
- Self-service association onboarding
- Fully automated garage map generation (host detect_spots.py on Modal or similar — currently ops-assisted)
- Waiting list priority rules (e.g. seniority, disability)
- Resident portal (view assignment history)
- Multi-spot households
- Billing / subscription management
