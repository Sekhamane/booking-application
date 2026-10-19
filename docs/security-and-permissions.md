# Teabag Booking System: security model

## Roles

Every authenticated account gets the `customer` role. Provider, admin, and security-admin roles are assigned through a trusted Supabase administration path; signup metadata cannot set a privileged role. The `profiles.role` check and row policy prevent a user from changing their own role.

| Module/data | Visitor | Customer | Provider | Admin | Security admin |
|---|---|---|---|---|---|
| Active service catalogue and provider directory | Read | Read | Read | Read/write | Read |
| Own profile | â€” | Read/update contact fields | Read/update contact fields | Read | Read |
| Own bookings | â€” | Read, request, cancel | â€” | Read | Read |
| Assigned bookings/customer details | â€” | â€” | Read, move through allowed statuses | Read | Read |
| Provider availability and services | — | Read availability | Manage own drafts; publish when active | Manage all | Read |
| Waitlist | â€” | Join/read own | Read/update assigned service queue | Manage all | Read |
| Published marketing content | Read | Read | Read | Manage | Read |
| Audit events and privacy requests | â€” | Create/read own request | â€” | Read | Read/manage requests |
| Role assignment/security policy | â€” | â€” | â€” | Provisioned out of band | Provisioned out of band |

The frontend route guards improve navigation only. Supabase RLS and security-definer database functions are the enforcement layer. Do not treat hidden buttons or routes as authorization.

## Security Admin hostname

Set `VITE_SECURITY_HOST` to the exact security hostname at build time (for example, `security.example.com`). When opened on that host, the app exposes only the Security Admin sign-in and its audit, roles, and privacy-request screens. Configure the hostname as a custom domain for the same static deployment, retain SPA rewrites for `/`, `/roles`, and `/privacy`, and allow the hostname in Supabase Auth redirect URL settings. Local host-based development can use `VITE_SECURITY_HOST=security.localhost` and open `http://security.localhost:5173`. This is a separate browser origin and entry point; it does not replace database RLS, and it does not isolate the Supabase project or its API.

## Data classification

| Class | Examples | Handling |
|---|---|---|
| Public | Active service descriptions, provider display names, public availability | May be read without an account; exclude private provider/contact fields. |
| Private | Customer profile, own bookings, provider schedule, queue status | Owner and the provider assigned to a booking only; admin access is role-gated. |
| Confidential | Internal notes, provider/customer operations, reports, audit metadata | Limit to staff with an operational need and record sensitive administrative actions. |
| Restricted | Auth credentials, service-role/signing keys, payment documents, payment credentials | Never put in browser bundles or public storage. Payment documents must use private buckets and authorized access if reintroduced. |

Booking names, email, phone, notes, and payment documents belong in the protected database/storage. Blockchain proofs must contain only hashes and non-identifying metadata.

## Database migration and bootstrap

Apply migrations `001_initial_schema.sql` through `009_qualify_customer_stats_trigger.sql` in numerical order to a Supabase project. Migration 008 restores the `public.customers` table and its booking foreign-key relation, which provider booking queries embed. Migration 009 qualifies the customer-stats trigger's table references so booking confirmations work with the status RPC's restricted search path. Review the project's existing grants, storage buckets, and Auth email-confirmation settings as well: repository migrations cannot inspect or fix project-level configuration.

The first administrator and security administrator must be created by a trusted operator in the Supabase SQL editor or another privileged server-side provisioning process. Never add a public “make me admin” signup option. Provider accounts require an administrator to grant the provider role and approve the provider profile before it can publish services or accept bookings. Pending providers can prepare unpublished service drafts; RLS prevents them from publishing until approved, and public catalogue reads exclude inactive providers.

Booking requests go through `create_booking`, which reads the service price from the database, checks provider availability, and inserts an assigned booking. The partial unique index prevents two active bookings from taking the same provider/date/slot. Provider, admin, and customer status actions go through narrowly scoped functions and write audit events. Migration `004_booking_status_transitions.sql` restricts admin transitions to the forward-only booking lifecycle and requires a reason for rejection or cancellation.

Customers can see their own waitlist entries and leave through `leave_my_waitlist`; direct deletion remains denied by RLS. Providers record manual contact and the six-hour response window from their workspace. The platform does not send notification messages until an approved delivery provider is configured.

New booking requests use `create_booking_with_details`, which calls the authoritative booking function and stores validated category details in the same database transaction. Flight requests collect route, trip dates, and passenger count; accommodation requests collect destination, stay dates, guests, and rooms; healthcare requests collect only in-person/telehealth preference. These fields are private booking data and are deliberately excluded from blockchain commitments. Flights/hotels still represent provider-assisted booking requests; direct airline inventory, hotel-night inventory, fare repricing, ticketing, and healthcare integrations need separate domain and vendor integrations.

## Privacy controls

Signup records acceptance of the privacy notice and separately records optional marketing consent. Customers can export their account and booking history and submit a deletion request. Deletion requests require a human review because bookings, accounting obligations, fraud prevention, and related records may need different retention handling. Configure a retention schedule and operational request procedure before claiming legal compliance.

## Current implementation limits

- Service rows need provider assignment and `coverage_levels` JSON entries shaped as `{ "level": 1, "label": "Standard", "price": 100 }` for the booking flow.
- Providers need availability rows for each weekday/time slot they accept.
- Existing salon records may remain in the database; do not expose them as marketplace listings without reviewing/updating the data.
- Payment-slip uploads are not part of the new booking submission flow. The legacy bucket and old tables need a separate migration and storage-policy review before any sensitive files are used.
- Audit events currently cover booking creation, cancellation, status changes, waitlist join/contact updates, provider/service/availability changes, privacy requests, and role/provider approval changes. Broader read-access auditing remains work to do.
- AI forecasting and blockchain proof submission are not included in this foundation migration.
