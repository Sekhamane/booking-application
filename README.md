# Teabag Booking Platform

A category-based booking platform for flights, accommodation, healthcare appointments, and other provider services. It provides customer, provider, admin, and security-admin workspaces.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local Vite URL, usually `http://localhost:5173`. Create `.env` from `.env.example` and configure a Supabase project. Authentication and real booking require Supabase; the former email-only demo login has been removed.

## Security Admin subdomain

The security workspace can be served from a dedicated hostname while the marketplace remains on its main hostname. Set `VITE_SECURITY_HOST` to the exact security hostname before building. The Security Vercel project must use `booking-security.vercel.app`; the main project should use the same value so security-admin links point to that deployment. The security hostname serves only Security Admin sign-in and workspace routes; the marketplace hostname does not expose those routes. Add both domains to the hosting provider and add the security hostname to Supabase Auth's allowed redirect URLs. The subdomain provides a separate web origin; database RLS and role checks remain the authorization boundary. For local development, set `VITE_SECURITY_HOST=security.localhost` and open `http://security.localhost:5173`. See [`docs/security-and-permissions.md`](docs/security-and-permissions.md) and [`docs/deployment-runbook.md`](docs/deployment-runbook.md).

## Supabase setup

Run these SQL migrations in order from the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_security_and_booking_foundation.sql`
3. `supabase/migrations/003_seed_default_time_slots.sql`
4. `supabase/migrations/004_booking_status_transitions.sql`
5. `supabase/migrations/005_category_booking_details.sql`
6. `supabase/migrations/006_customer_waitlist_controls.sql`
7. `supabase/migrations/007_provider_service_drafts.sql`
8. `supabase/migrations/008_restore_customers_relation.sql`
9. `supabase/migrations/009_qualify_customer_stats_trigger.sql`
10. `supabase/migrations/009_service_category_details.sql`
11. `supabase/migrations/010_security_messages.sql`
12. `supabase/migrations/011_security_admin_access_control.sql`

Then configure Supabase Auth email confirmation and trusted staff accounts as described in [`docs/first-run-setup.md`](docs/first-run-setup.md). Review existing grants and storage bucket policies. Do not grant roles from client signup metadata. See [`docs/security-and-permissions.md`](docs/security-and-permissions.md) for the permission matrix and data classification.

Providers can prepare private service drafts before approval and publish them after an admin activates their provider profile. The seed migration provides half-hour start times from 08:00 to 20:00; providers select their own weekly slots. A bookable service needs an active provider profile and `coverage_levels` JSON containing at least one `{ "level": 1, "label": "Standard", "price": 100 }` option. Booking creation reads that price server-side, checks the schedule and blackout dates, serializes requests per provider/date, rejects overlapping durations, and also uses a unique index to prevent duplicate active reservations for the same slot.

This is a general appointment booking foundation. Flights and hotels are represented as provider services today; airline fare inventory, seat selection, hotel room/night inventory, and healthcare system integrations require dedicated domain modules and external integrations before those categories can be used for live reservations.

The category-aware request form collects flight route/trip dates/passenger count, accommodation destination/stay dates/guest count, or healthcare visit mode. The server validates and stores those fields atomically with the booking, and the booking RLS rules protect them. This supports provider-assisted requests; it does not reserve airline seats, hotel nights, or clinical appointments in third-party systems.

## AI demand prediction

The Python pipeline in [`ai/`](ai/) prepares anonymized daily service/time-period demand, trains a Random Forest, evaluates it against a chronological holdout and lag-seven baseline, measures learning-curve saturation, and publishes aggregate results to protected Supabase tables. See [`ai/README.md`](ai/README.md). Do not interpret synthetic demo scores as real-world accuracy.

## Blockchain record proofs

The Solidity registry in [`blockchain/contracts/BookingProofRegistry.sol`](blockchain/contracts/BookingProofRegistry.sol) accepts SHA-256 booking event commitments. Only hashes and non-identifying values go on-chain; names, email, phone, notes, payment documents, and service labels remain off-chain. Supabase Edge Functions submit and verify proofs; configure and deploy instructions are in [`blockchain/README.md`](blockchain/README.md).

## Server-side secrets

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` belong in browser configuration. Supabase service-role credentials, blockchain signing keys, RPC secrets, and notification provider credentials must be stored in server/Edge Function secret settings. Never use a `VITE_` prefix for them.

## Deployment notes

The repository includes `vercel.json` for the Vite single-page application and Supabase Edge Functions under `supabase/functions/`. Follow [`docs/deployment-runbook.md`](docs/deployment-runbook.md) to configure Vercel and deploy the proof contract and functions. No hosted deployment or external provider credentials are included in the repository.

The GDPR assessment is provided as a spreadsheet-style Markdown document at [`docs/gdpr-assessment.md`](docs/gdpr-assessment.md). It records implementation evidence and open compliance work; it is not a legal certification.
