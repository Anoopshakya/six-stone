## Goal
Build an exclusive investor conference site where guests register, receive a unique QR code by email, and staff can scan that QR at the gate to mark them as attended.

## Stack & defaults (since you skipped the questions)
- **Lovable Cloud** (database, auth, email) — enabled as part of the build.
- **Seat cap:** 150 (configurable in the database).
- **Form fields:** Full name, Email, Phone, Company, Designation, Investor type (Angel / VC / PE / Family Office / Other), LinkedIn (optional).
- **Admin access:** Email + password login. The first user to sign up via `/admin/login` becomes admin (role stored in a separate `user_roles` table — never on profiles).
- **Event details:** Placeholder copy ("Apex Investor Summit 2026") that you'll edit afterward.

## Pages
1. **`/` — Landing page**
   - Hero with event name, date, venue, tagline
   - Why attend / agenda highlights / speakers placeholder section
   - Sticky "Register" CTA → opens registration form
   - Seats-remaining counter (live from DB)
   - Footer with contact

2. **`/register` (or modal on `/`)** — Registration form with validation (zod). On submit:
   - Insert row into `registrations` with a unique `ticket_code` (UUID)
   - Reject if seat cap reached
   - Send confirmation email containing the QR code (PNG embedded inline) and ticket code
   - Show success screen with downloadable QR

3. **`/ticket/:code`** — Public ticket page (in case the email is lost) showing the QR for that code. Read-only.

4. **`/admin/login`** — Email/password sign-in.

5. **`/admin`** (protected) — Dashboard:
   - Stats: total registered, attended, remaining seats
   - Searchable, filterable table of all registrants (name, email, company, status, registered_at, attended_at)
   - CSV export
   - "Open scanner" button

6. **`/admin/scan`** (protected) — Gate scanner:
   - Camera-based QR scanner (`html5-qrcode`)
   - On scan: looks up ticket → shows guest details → "Mark attended" button (or auto-mark)
   - Prevents double check-in (shows "Already checked in at HH:MM")
   - Manual code entry fallback

## Database
- `registrations` — id, full_name, email (unique), phone, company, designation, investor_type, linkedin_url, ticket_code (unique), status ('registered' | 'attended'), registered_at, attended_at
- `user_roles` — id, user_id, role ('admin') — separate table with `has_role()` security-definer function
- `event_settings` — single row: seat_cap, event_name, event_date, venue (so you can tweak without code)
- RLS:
  - `registrations`: public INSERT (with seat-cap check via trigger), SELECT only for admins, UPDATE (mark attended) only for admins
  - `user_roles`: SELECT own row; admin-only writes
  - `event_settings`: public SELECT, admin-only UPDATE

## Server functions (createServerFn)
- `registerAttendee` — validates input, checks cap, inserts row, generates QR, enqueues confirmation email via Lovable Emails (built-in)
- `getTicket(code)` — returns minimal ticket info for the public ticket page
- `listRegistrations` (admin) — paginated list with filters
- `markAttended(code)` (admin) — flips status to attended, stamps `attended_at`, returns guest info; idempotent
- `getStats` (admin) — counts for dashboard

## Email
Lovable's built-in email system (no third-party setup). The confirmation email includes:
- Event name/date/venue
- Guest name + ticket code
- Inline QR image
- Note: "Show this QR at the entrance"

Email domain setup happens via the dialog on first send.

## Tech notes
- QR generation: `qrcode` npm package (server-side PNG → base64 inline in email; also rendered on success page and `/ticket/:code`)
- Scanner: `html5-qrcode` (works on mobile browsers, no native app needed)
- Design: dark, premium "investor conference" aesthetic — deep navy + gold accents, serif display headings, generous whitespace. I'll commit to a specific direction during build unless you want me to generate options first.

## Out of scope (tell me if you want any of these)
- Payments / paid tickets
- Multiple ticket tiers
- Waitlist after seats fill
- SMS delivery of QR
- Native mobile scanner app
