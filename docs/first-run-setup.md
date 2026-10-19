# First run with Supabase

This is a checklist for a new Supabase project. Use the project SQL editor as a trusted operator; never expose the service-role key in the browser.

## 1. Create the schema

Run `001_initial_schema.sql`, `002_security_and_booking_foundation.sql`, `003_seed_default_time_slots.sql`, `004_booking_status_transitions.sql`, `005_category_booking_details.sql`, `006_customer_waitlist_controls.sql`, and `007_provider_service_drafts.sql` in that order. Configure Auth email confirmation and set the deployed app URL in Supabase Auth's site and redirect URL settings.

## 2. Provision the first staff accounts

Register each staff account through `/account?mode=register` and confirm its email. In the Supabase SQL editor, promote only the account you control. The following statements bypass normal user RLS because the SQL editor is privileged; replace the addresses before running:

```sql
update public.profiles set role = 'admin'
where lower(email) = lower('admin@example.com');

update public.profiles set role = 'security_admin'
where lower(email) = lower('security@example.com');
```

Confirm each statement affected exactly one row. Keep at least one trusted account for each role. This initial bootstrap is performed out of band; later role changes should use the audited admin/security-admin screens.

## 3. Add a provider and service

An admin changes a registered user's role to `provider` in **User management**. The database creates an inactive provider profile. The provider can prepare private service drafts while waiting. In **Provider management**, approve the account; the provider can then publish services and set weekly availability. Customers see only published services from active providers and can request only configured slots.

## 4. Configure the browser

Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings. Restart Vite after changing `.env`. Only the public anon key belongs in this file.

```powershell
npm.cmd run dev
```

## 5. Deploy server functions when needed

The core auth and booking workflow uses database functions and works without blockchain configuration. For privacy deletion and proof recording/verification, install and authenticate the Supabase CLI, link the project, set the Edge Function secrets through Supabase, then deploy:

```powershell
supabase functions deploy process-privacy-deletion
supabase functions deploy record-booking-proof
supabase functions deploy verify-booking-proof
```

Set `SUPABASE_SERVICE_ROLE_KEY` for all three functions. The deletion function also needs `SUPABASE_ANON_KEY`. The proof functions need `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_CHAIN_ID`, `BLOCKCHAIN_NETWORK`, and `BLOCKCHAIN_CONTRACT_ADDRESS`; the record function also needs `BLOCKCHAIN_PRIVATE_KEY`. Deploy the registry contract and configure its relayer before turning on proof submission. Store all such values in Supabase Function secrets, not in `.env` or source control.

## Scope to understand before launch

The current platform supports provider services, prices, scheduled slots, booking requests, cancellation, and status transitions. The flights and accommodation categories are catalogue categories; live airline inventory, fare pricing, hotel room/night inventory, healthcare records, and external booking integrations are not implemented. Review data retention, security policies, and privacy obligations with the project owner before using real healthcare or payment data.
