# BRF Garage — MVP Plan

## Done ✅
- [x] Project setup (Next.js, Neon, Resend, Auth.js, shadcn)
- [x] Invite-based auth (invite token → set password → login)
- [x] Admin: invite residents, residents table with status
- [x] Admin: withdraw pending invites, remove residents
- [x] Dashboard with role-based cards
- [x] Garage map — full flow (see below)

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
- Fully automated garage map generation (host detect_spots.py on Modal or similar — currently ops-assisted)
- Waiting list priority rules (e.g. seniority, disability)
- Resident portal (view assignment history)
- Multi-spot households
- Billing / subscription management
