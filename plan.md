# NBDT Guest Login, Tours & Transfers — Ultra-Detailed Implementation Plan

## Current State Summary

**Stack:** Next.js 15 + React 19 + PostgreSQL + Tailwind CSS + next-intl (en/es)
**Existing DB tables:** `guests`, `reservations`, `vendors`, `transfers`, `tour_products`, `tour_schedules`, `tour_bookings`, `staff_users` (with roles: admin, manager, concierge, logistics, captain, etc.)
**Existing guest UI:** Basic tour listing page (no auth, QR-code room identification), bottom-nav with Menu/Tours/Orders/Chat
**Existing staff UI:** Full authenticated staff panel with tour products management, tour bookings, transfers, dashboard widgets
**Existing API:** `/api/tour-products`, `/api/tour-bookings`, `/api/tour-schedules`, `/api/transfers`, `/api/guest/identify`

---

## PART 1: USER ROLES & PERSONAS

### Role 1: GUEST (unauthenticated hotel guest)
- **Authentication:** Reservation number + last name (no email/password)
- **Access:** Their own tours, transfers, and booking history only
- **Device:** Mobile phone (mobile-first design critical)

### Role 2: CONCIERGE / FRONT DESK (staff)
- **Already exists** with roles `concierge` and `front_desk`
- **Creates/edits** tour bookings, transfers for guests
- **Manages** tour product catalog, schedules

### Role 3: FLEET SUPERVISOR (new role: `fleet_supervisor`)
- **Purpose:** The "captain's boss" — manages boat assignments, captain schedules
- **Access:** Fleet dashboard, boat/captain assignment, scheduling conflicts, statistics
- **Could also be** a guest experience manager with the right permissions

### Role 4: BOAT CAPTAIN (existing role: `captain`)
- **Access:** Their own assigned trips (tours + boat transfers) for the day/week
- **Sees:** Trip details, passenger count, departure time, route
- **Updates:** Trip status (departed, arrived, completed)

### Role 5: ADMIN / MANAGER (existing)
- **Full access** to everything including fleet analytics and GPS provisioning

---

## PART 2: USER SCENARIOS (ROLE-PLAY)

---

### SCENARIO 1: Guest Login Flow

**Actor:** Maria Rodriguez, checked into Villa 12, reservation #RES-2026-4521

**Step 1 — Landing Page**
- Maria opens the guest portal on her phone
- She sees a clean login screen with the Nayara logo
- Two fields: "Reservation Number" and "Last Name"
- Language selector (EN/ES) at the top

**Step 2 — Authentication**
- Maria enters: `RES-2026-4521` and `Rodriguez`
- System queries: `SELECT r.*, g.* FROM reservations r JOIN guests g ON r.guest_id = g.id WHERE r.opera_resv_id = $1 AND LOWER(g.last_name) = LOWER($2) AND r.status = 'CHECKED IN'`
- JWT token is issued with `{ guest_id, reservation_id, room, property_id }` stored in httpOnly cookie
- Redirected to Guest Home

**Step 3 — Session Persistence**
- Cookie lasts 7 days or until checkout
- Every page load verifies the session
- If reservation status changes to CHECKED OUT, session is invalidated

**Screens needed:**
1. `guest/login/page.tsx` — Login form
2. `api/auth/guest-login/route.ts` — Authentication endpoint
3. `api/auth/guest-verify/route.ts` — Session verification
4. Updated `guest/layout.tsx` — Auth wrapper
5. Updated `guest/page.tsx` — Now shows Guest Home (not language selector)

---

### SCENARIO 2: Guest Browsing Tours

**Actor:** Maria Rodriguez (authenticated guest)

**Step 1 — Guest Home Dashboard**
- After login, Maria sees her personalized home:
  - "Welcome, Maria" header with room number
  - Stay dates (Feb 20 - Feb 27)
  - Quick action cards: "Tours & Activities", "My Transfers", "Messages"
  - Upcoming activities timeline (next 2-3 days)

**Step 2 — Tours Catalog**
- Maria taps "Tours & Activities"
- Sees a beautiful card-based catalog:
  - Hero image per tour (from `tour_products.images` JSONB array)
  - Tour name (localized EN/ES)
  - Duration badge ("2h", "Half Day")
  - Price range ("From $85/person")
  - Type filter pills: All | Water | Land | Sunset | Cultural
  - **Important filter:** Only shows tours that are NOT spa type (spa is separate module)

**Step 3 — Tour Detail**
- Maria taps "Zapatilla Island Tour"
- Full-screen detail view:
  - Image carousel/gallery (swipeable on mobile)
  - Description (localized)
  - Duration, meeting point, what's included
  - Pricing breakdown: Shared $85/pp, Private $350/boat
  - Available dates (from tour_schedules where is_available=true and capacity_remaining > 0)
  - Calendar-style date picker showing available slots
  - "Book This Tour" CTA button

**Step 4 — Booking**
- Maria selects March 3rd, 9:00 AM slot
- Chooses "Shared" mode, 2 guests
- Adds special request: "We'd like snorkeling gear"
- Taps "Request Booking"
- Sees confirmation: "Your booking request has been sent! Our concierge team will confirm shortly."
- Booking created with `guest_status: 'pending'`

**Screens needed:**
1. `guest/page.tsx` — Redesigned as Guest Home Dashboard
2. `guest/tours/page.tsx` — Enhanced catalog with images and filters
3. `guest/tours/[id]/page.tsx` — Tour detail with gallery, schedule picker, booking form
4. Updated bottom nav: Home | Tours | Transfers | Chat

---

### SCENARIO 3: Guest Managing Transfers

**Actor:** Maria Rodriguez (authenticated guest)

**Step 1 — My Transfers View**
- Maria taps "My Transfers" from home or bottom nav
- Sees her existing transfers (imported from legacy/Opera):
  - **Arrival:** Feb 20, 2:30 PM, Bocas Airport → Nayara Resort (Confirmed)
  - **Departure:** Feb 27, 10:00 AM, Nayara Resort → Bocas Airport (Pending)
- Each transfer card shows:
  - Date & time
  - Origin → Destination with visual arrow
  - Type badge (Boat / Land / Airport)
  - Status pill (Pending / Confirmed / Completed)
  - Number of passengers
  - Vendor name (if assigned)

**Step 2 — Transfer Detail**
- Maria taps her departure transfer
- Sees full details:
  - Route map placeholder
  - Flight number (if applicable)
  - Passenger count
  - Special notes
  - Status timeline (pending → confirmed → day-of → completed)
- If status is 'pending', she can:
  - Edit time preference
  - Edit number of passengers
  - Add special requests
  - Cancel transfer

**Step 3 — Request New Transfer**
- Maria needs an inter-hotel transfer to visit another island
- Taps "Request Transfer"
- Form: Date, Preferred Time, Origin, Destination, Number of Passengers, Notes
- Transfer created with `guest_status: 'pending'`, `transfer_type: 'inter_hotel'`

**Screens needed:**
1. `guest/transfers/page.tsx` — My Transfers list
2. `guest/transfers/[id]/page.tsx` — Transfer detail/edit
3. `guest/transfers/new/page.tsx` — Request new transfer form
4. `api/guest/transfers/route.ts` — Guest-scoped transfer CRUD

---

### SCENARIO 4: Staff Managing Tour Schedules (Enhanced)

**Actor:** Ana, Concierge staff member

**Step 1 — Tour Products with Enhanced Data**
- Ana opens Staff > Tour Products
- Existing page but enhanced with:
  - Image upload/management for each product
  - **"Requires Boat" toggle** — marks tour as boat-dependent
  - **Boat selection** — when requires_boat=true, link to a boat record
  - **Required captain skills** — tags like "ocean_certified", "snorkeling_guide"
  - Vendor filter that highlights Nayara/NBDT-operated tours vs third-party

**Step 2 — Schedule Management (Enhanced)**
- Ana opens schedules for "Zapatilla Island Tour"
- Enhanced schedule view:
  - Calendar view (week/month) showing all slots
  - Each slot shows: time, capacity, **assigned boat**, **assigned captain**
  - Color-coded: green (fully staffed), yellow (needs captain/boat), red (conflict)
  - Drag-and-drop for rescheduling (future enhancement)

**Step 3 — Identifying Nayara-Operated Tours**
- Tours/transfers with vendor = "Nayara" or "NBDT" are auto-flagged as `is_internal_operation = true`
- **Exception:** If vendor is Nayara/NBDT but type is 'spa', it's excluded from fleet management
- Visual badge on tour cards: "NBDT Fleet" or "External Vendor"

**Database changes needed:**
- `tour_products`: ADD `requires_boat BOOLEAN DEFAULT FALSE`, `boat_id UUID REFERENCES boats(id)`, `required_skills TEXT[]`, `is_internal_operation BOOLEAN DEFAULT FALSE`
- New table: `boats`
- New table: `captain_skills`

---

### SCENARIO 5: Fleet Supervisor — Boat & Captain Management

**Actor:** Carlos, Fleet Supervisor (new role: `fleet_supervisor`)

**Step 1 — Fleet Dashboard**
- Carlos opens the Fleet Operations dashboard
- Sees today's operations at a glance:
  - **Boat Utilization Panel:** Each boat as a timeline bar showing:
    - 7:00-9:00 — "Zapatilla Tour" (Captain: Miguel) — Green
    - 9:30-10:30 — "Transfer: Guest Arrival" — Green
    - 11:00-13:00 — "Mangrove Tour" (Captain: TBD) — Yellow/Warning
    - 14:00-16:00 — Available — Gray
  - **Unassigned Alerts:** "3 tours tomorrow need captain assignment"
  - **Captain Status:** Who's available, who's on assignment, who's off

**Step 2 — Boats Registry**
- Carlos opens Boats management
- Sees all boats:
  - Name: "Nayara Explorer I"
  - Type: Speedboat / Catamaran / Panga
  - Capacity: 12 passengers
  - Status: Active / Maintenance / Out of Service
  - Photo
  - Current location (future GPS)
  - Assigned home dock
  - Maintenance schedule
- Can add/edit/deactivate boats

**Step 3 — Captain Management**
- Carlos opens Captain roster
- Sees all staff with `role = 'captain'`:
  - Name, photo, contact
  - **Skills/Certifications:** Ocean Navigation, Snorkeling Guide, Fishing Expert, Night Navigation
  - **Weekly Schedule:** Mon-Fri 6AM-4PM, Off Sat-Sun
  - **Current Assignment:** "On Zapatilla Tour, ETA return 11:30"
  - **Statistics:** 142 trips this month, 4.9/5 guest rating

**Step 4 — Assigning a Captain to a Tour**
- Carlos sees alert: "Mangrove Tour tomorrow 11:00 needs captain"
- Opens assignment modal:
  - Shows eligible captains (who have required skills AND are available at that time)
  - Each captain card shows: name, skills match (green checkmarks), other assignments that day
  - **Conflict detection:** "Warning: Captain Miguel has Zapatilla Tour 9:00-11:00, insufficient buffer time"
  - **Skill check:** "Captain Pedro lacks 'snorkeling_guide' certification needed for this tour"
- Carlos assigns Captain Luis (available, all skills match)
- System updates `tour_schedule.captain_id` and `tour_schedule.boat_id`

**Step 5 — Handling Boat Transfers**
- A guest departure transfer is marked as "boat" type
- Carlos sees it in the fleet timeline
- Must assign a boat + captain (or just a boat if the route is simple)
- System checks for conflicts: "Boat Nayara Explorer I is booked for Zapatilla Tour 9:00-11:00, transfer at 10:30 would conflict"
- Carlos either reschedules or uses a different boat

**Step 6 — Statistics & Reports**
- Carlos opens Fleet Analytics:
  - Boat utilization rate (hours active / hours available) per boat per week/month
  - Captain workload distribution (trips/hours per captain)
  - Revenue per boat (tours + transfers revenue attributed)
  - Peak times heatmap (when are boats most/least used)
  - Fuel consumption tracking (manual entry for now)
  - Trip completion rate
  - Guest satisfaction correlation per captain

**Database tables needed:**
```sql
-- BOATS
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('speedboat', 'catamaran', 'panga', 'yacht', 'other')),
  capacity INT NOT NULL DEFAULT 12,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service')),
  photo_url TEXT,
  home_dock TEXT,
  registration_number TEXT,
  gps_device_id TEXT,
  notes TEXT,
  property_id UUID REFERENCES properties(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAPTAIN SKILLS
CREATE TABLE captain_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  certified_at DATE,
  expires_at DATE,
  notes TEXT,
  UNIQUE(staff_id, skill)
);

-- CAPTAIN SCHEDULES (weekly availability patterns)
CREATE TABLE captain_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

-- CAPTAIN TIME-OFF
CREATE TABLE captain_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES staff_users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied'))
);

-- FLEET ASSIGNMENTS (links schedules/transfers to boats+captains)
CREATE TABLE fleet_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boat_id UUID NOT NULL REFERENCES boats(id),
  captain_id UUID REFERENCES staff_users(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('tour', 'transfer')),
  tour_schedule_id UUID REFERENCES tour_schedules(id),
  transfer_id UUID REFERENCES transfers(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'departed', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  EXCLUDE USING gist (
    boat_id WITH =,
    date WITH =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp
    ) WITH &&
  ) WHERE (status != 'cancelled')
);

-- BOAT MAINTENANCE LOG
CREATE TABLE boat_maintenance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('routine', 'repair', 'inspection', 'fuel')),
  description TEXT,
  cost DECIMAL(10,2),
  performed_by TEXT,
  date DATE NOT NULL,
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPS TRACKING (provisioned for future)
CREATE TABLE gps_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  latitude DECIMAL(10,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  speed_knots DECIMAL(6,2),
  heading DECIMAL(5,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'gps_device', 'ais'))
);
```

**Screens needed:**
1. `staff/(authenticated)/fleet/page.tsx` — Fleet Operations Dashboard (timeline view)
2. `staff/(authenticated)/fleet/boats/page.tsx` — Boat registry CRUD
3. `staff/(authenticated)/fleet/captains/page.tsx` — Captain roster + skills + schedule
4. `staff/(authenticated)/fleet/assignments/page.tsx` — Assignment board
5. `staff/(authenticated)/fleet/analytics/page.tsx` — Fleet statistics & reports

---

### SCENARIO 6: Captain's Day View

**Actor:** Captain Miguel, boat operator

**Step 1 — Captain Login**
- Miguel logs in with his staff credentials (existing system)
- System detects `role = 'captain'` and shows Captain-specific view

**Step 2 — My Trips Today**
- Clean, simple mobile-friendly view:
  - Today's date prominent at top
  - Trip cards in chronological order:
    - **7:00 AM — Zapatilla Island Tour**
      - Boat: Nayara Explorer I
      - Guests: 8 passengers (names listed)
      - Duration: 3 hours
      - Meeting point: Main Dock
      - Status: [Depart] button
    - **11:00 AM — Transfer: Smith Family Departure**
      - Boat: Nayara Explorer I
      - Guests: 4 passengers
      - Route: Resort → Bocas Airport
      - Status: Waiting

**Step 3 — Trip Lifecycle**
- Miguel taps [Depart] on Zapatilla Tour
- Status changes to "In Progress", timestamp recorded
- At destination, taps [Arrived]
- On return, taps [Completed]
- All state changes logged in `fleet_assignments.status` + history

**Step 4 — Upcoming Schedule**
- Miguel can see next 7 days of assignments
- Can flag conflicts or request changes (sends notification to supervisor)

**Screens needed:**
1. `staff/(authenticated)/captain/page.tsx` — Captain day view
2. `staff/(authenticated)/captain/schedule/page.tsx` — Week ahead view
3. `api/captain/trips/route.ts` — Captain-scoped trip data

---

### SCENARIO 7: Tour Requiring Boat — End-to-End

**Full lifecycle of a boat-dependent tour:**

1. **Admin creates tour product** "Zapatilla Island Tour"
   - Sets `requires_boat = true`
   - Links to boat "Nayara Explorer I" (or "any available")
   - Sets `required_skills = ['ocean_certified', 'snorkeling_guide']`
   - Sets `is_internal_operation = true` (vendor = NBDT)
   - Duration: 180 minutes

2. **Concierge creates schedule** for March 3, 9:00 AM
   - System auto-flags: "This tour requires boat assignment"
   - Schedule appears in Fleet Dashboard as "yellow" (needs assignment)

3. **Fleet Supervisor assigns** boat + captain
   - Selects "Nayara Explorer I"
   - System shows eligible captains (skills match + available)
   - Assigns Captain Miguel
   - Schedule turns "green" (fully staffed)

4. **Guest books the tour** via guest portal
   - Sees available dates (only shows dates where boat+captain are assigned)
   - Books March 3, 9:00 AM, 2 guests
   - `tour_booking` created, `tour_schedule.capacity_remaining` decremented

5. **Day of tour**
   - Captain Miguel sees trip in his day view
   - Marks departure, arrival, completion
   - Guest receives status updates (future: push notifications)

6. **Conflict scenario**: A guest departure transfer at 10:30 AM needs a boat
   - Fleet supervisor sees the conflict on the timeline
   - Options: use a different boat, reschedule the transfer, or adjust the tour return time
   - System prevents double-booking via exclusion constraint

---

### SCENARIO 8: Boat Transfer Flow

**Actor:** Guest requesting departure

1. **Transfer exists** (from legacy import or staff creation):
   - Type: 'departure', Date: Feb 27, Time: 10:00 AM
   - Origin: Nayara Resort, Destination: Bocas Airport

2. **Staff marks as boat transfer:**
   - On the transfer record, sets `requires_boat = true`
   - Or: transfer route is known to require boat (Resort → Airport always by boat)
   - System auto-detects based on origin/destination configuration

3. **Fleet supervisor assigns:**
   - Transfer appears in fleet timeline
   - Assigns boat + captain
   - System calculates: transfer takes ~45 min, so boat is blocked 9:45-10:45

4. **Guest sees in portal:**
   - Transfer card shows "Boat Transfer" badge
   - Shows assigned boat name (optional, based on settings)
   - Departure time, meeting point (dock)

**Database changes:**
- `transfers`: ADD `requires_boat BOOLEAN DEFAULT FALSE`, `fleet_assignment_id UUID REFERENCES fleet_assignments(id)`

---

### SCENARIO 9: Identifying Internal vs External Operations

**Rule:** A tour or transfer is "internal" (managed by our fleet) when:
- `vendor.name` ILIKE '%nayara%' OR vendor.name ILIKE '%nbdt%'
- **AND** `tour_product.type != 'spa'` (spa excluded from fleet management)

**Implementation:**
- Add `is_internal_operation` boolean to `tour_products` and a computed/flagged field on `transfers`
- On data import/creation, auto-detect based on vendor name
- Staff can manually override
- Internal operations get the fleet management layer (boat + captain assignment)
- External operations pass through to vendor management (existing vendor portal)

**Visual distinction in UI:**
- Internal tours: "Nayara Fleet" badge, shows boat/captain info
- External tours: "Partner: [Vendor Name]" badge, shows vendor contact

---

## PART 3: COMPLETE SCREEN INVENTORY

### Guest Portal Screens (Mobile-First)

| # | Route | Screen Name | Description |
|---|-------|-------------|-------------|
| G1 | `/guest/login` | Guest Login | Reservation # + Last Name |
| G2 | `/guest` | Guest Home | Welcome, quick actions, upcoming activities |
| G3 | `/guest/tours` | Tour Catalog | Card grid with images, filters, search |
| G4 | `/guest/tours/[id]` | Tour Detail | Gallery, info, schedule picker, book CTA |
| G5 | `/guest/transfers` | My Transfers | List of guest's transfers with status |
| G6 | `/guest/transfers/[id]` | Transfer Detail | Full transfer info, edit if pending |
| G7 | `/guest/transfers/new` | Request Transfer | New transfer request form |
| G8 | `/guest/bookings` | My Bookings | All tour bookings with status |
| G9 | `/guest/bookings/[id]` | Booking Detail | Tour booking details, cancel option |

### Staff Fleet Management Screens

| # | Route | Screen Name | Description |
|---|-------|-------------|-------------|
| S1 | `/staff/fleet` | Fleet Dashboard | Timeline view of all boats, daily ops |
| S2 | `/staff/fleet/boats` | Boats Registry | CRUD for boat records |
| S3 | `/staff/fleet/captains` | Captain Roster | Skills, schedules, availability |
| S4 | `/staff/fleet/assignments` | Assignment Board | Drag-and-drop assign captains to slots |
| S5 | `/staff/fleet/analytics` | Fleet Analytics | Usage stats, revenue, heatmaps |

### Captain Screens

| # | Route | Screen Name | Description |
|---|-------|-------------|-------------|
| C1 | `/staff/captain` | Captain Day View | Today's trips, action buttons |
| C2 | `/staff/captain/schedule` | Captain Week View | 7-day schedule ahead |

### Enhanced Existing Screens

| # | Route | Changes |
|---|-------|---------|
| E1 | `/staff/tour-products` | Add requires_boat toggle, boat selector, skills tags, images mgmt |
| E2 | `/staff/transfers` | Add requires_boat flag, fleet assignment link |
| E3 | `/staff/dashboard` | Add fleet status widget |

---

## PART 4: DATABASE SCHEMA CHANGES (schema-v12.sql)

New tables:
1. `boats` — Fleet vessel registry
2. `captain_skills` — Staff skill certifications
3. `captain_schedules` — Weekly availability patterns
4. `captain_time_off` — Time off requests
5. `fleet_assignments` — Boat+captain assignments (with exclusion constraint)
6. `boat_maintenance_log` — Maintenance tracking
7. `gps_positions` — GPS tracking (provisioned)

Altered tables:
1. `tour_products` — ADD `requires_boat`, `default_boat_id`, `required_skills`, `is_internal_operation`
2. `transfers` — ADD `requires_boat`, `fleet_assignment_id`
3. `tour_schedules` — ADD `boat_id`, `captain_id`, `fleet_assignment_id`
4. `staff_users` — Expand role constraint to include `fleet_supervisor`

New permissions:
- `fleet:read`, `fleet:manage`, `fleet:assign`
- `boats:read`, `boats:manage`
- `captain:view_own`, `captain:update_status`

---

## PART 5: API ENDPOINTS

### Guest Auth
- `POST /api/auth/guest-login` — Login with reservation # + last name
- `GET /api/auth/guest-verify` — Verify guest session
- `POST /api/auth/guest-logout` — Clear guest session

### Guest Tours (guest-scoped, filtered by reservation)
- `GET /api/guest/tours` — Available tour catalog (active, non-spa)
- `GET /api/guest/tours/[id]` — Tour detail with available schedules
- `POST /api/guest/tour-bookings` — Create booking request
- `GET /api/guest/tour-bookings` — My bookings
- `PUT /api/guest/tour-bookings/[id]` — Cancel booking

### Guest Transfers (guest-scoped)
- `GET /api/guest/transfers` — My transfers
- `POST /api/guest/transfers` — Request new transfer
- `PUT /api/guest/transfers/[id]` — Edit pending transfer
- `DELETE /api/guest/transfers/[id]` — Cancel pending transfer

### Fleet Management (staff-scoped, fleet permissions)
- `GET/POST/PUT/DELETE /api/fleet/boats` — Boat CRUD
- `GET/POST/PUT/DELETE /api/fleet/assignments` — Fleet assignments
- `GET /api/fleet/timeline` — Timeline data for dashboard
- `GET /api/fleet/conflicts` — Detect scheduling conflicts
- `GET /api/fleet/analytics` — Usage statistics

### Captain (captain-scoped)
- `GET /api/captain/trips` — My trips (today / upcoming)
- `PUT /api/captain/trips/[id]/status` — Update trip status

### Staff Captain Management
- `GET/POST/PUT/DELETE /api/staff/captain-skills` — Manage captain certifications
- `GET/POST/PUT/DELETE /api/staff/captain-schedules` — Manage availability
- `GET/POST/PUT/DELETE /api/staff/captain-time-off` — Time off management

---

## PART 6: IMPLEMENTATION ORDER

### Phase 1: Guest Authentication & Home (Foundation)
1. Create `schema-v12.sql` with all new tables
2. Implement guest login API (`/api/auth/guest-login`)
3. Implement guest session verification
4. Build guest login page (`guest/login/page.tsx`)
5. Build guest home dashboard (`guest/page.tsx` redesign)
6. Update guest layout with auth wrapper
7. Update guest bottom nav (Home | Tours | Transfers | Chat)

### Phase 2: Enhanced Guest Tours Experience
8. Build guest tour catalog with images (`guest/tours/page.tsx` redesign)
9. Build tour detail page with gallery (`guest/tours/[id]/page.tsx`)
10. Build guest tour booking flow with schedule picker
11. Build my bookings page (`guest/bookings/page.tsx`)
12. Guest tour booking API endpoints

### Phase 3: Guest Transfers
13. Build guest transfers list (`guest/transfers/page.tsx`)
14. Build transfer detail page (`guest/transfers/[id]/page.tsx`)
15. Build new transfer request form
16. Guest transfer API endpoints

### Phase 4: Fleet Infrastructure — Boats & Captains
17. Build boats management page (`staff/fleet/boats/page.tsx`)
18. Build boats API endpoints
19. Build captain skills management
20. Build captain schedule management
21. Enhance tour products with boat/captain fields
22. Enhance transfers with boat flag

### Phase 5: Fleet Operations Dashboard
23. Build fleet timeline dashboard (`staff/fleet/page.tsx`)
24. Build assignment board with conflict detection
25. Build fleet assignment API with exclusion constraints
26. Add fleet status widget to staff dashboard

### Phase 6: Captain Interface
27. Build captain day view (`staff/captain/page.tsx`)
28. Build captain week schedule
29. Build captain trip status API
30. Captain push notification provisioning

### Phase 7: Analytics & GPS Provisioning
31. Build fleet analytics page
32. Build usage statistics API
33. Create GPS position table and API stubs
34. Build maintenance log management

---

## PART 7: INTERNAL OPERATION DETECTION LOGIC

```typescript
function isInternalOperation(vendorName: string, productType?: string): boolean {
  if (!vendorName) return false;
  const normalized = vendorName.toLowerCase().trim();
  const isNayaraVendor = normalized.includes('nayara') || normalized.includes('nbdt');
  if (productType === 'spa') return false;
  return isNayaraVendor;
}
```

This logic runs on:
- Tour product creation/import → sets `is_internal_operation`
- Transfer creation/import → sets `requires_boat` based on vendor + route
- Staff can manually override either flag

---

## PART 8: KEY DESIGN DECISIONS

1. **Guest auth is stateless JWT** — no guest password table, no guest accounts. Pure reservation-based auth.
2. **Fleet assignments use PostgreSQL exclusion constraints** — database-level prevention of double-booking boats.
3. **Soft skill matching** — captain assignment shows warnings for skill mismatches but doesn't hard-block (supervisor discretion).
4. **GPS is "provisioned"** — table exists, API stubs exist, but no device integration in v1.
5. **Spa exclusion is rule-based** — `is_internal_operation` flag is computed but overridable.
6. **Captain view is a special staff route** — not a separate portal, just a role-specific dashboard within the existing staff layout.
7. **Mobile-first for guests, desktop-first for staff** — guest portal is phone-optimized, fleet dashboard is widescreen-optimized.
