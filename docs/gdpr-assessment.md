# GDPR compliance assessment

Spreadsheet style assessment of the booking platform. This records implemented safeguards and remaining evidence; it is **not a legal certification or a claim that the operator is GDPR compliant**. Confirm applicability, lawful bases, retention periods, processors, and transfer safeguards with the organization responsible for the service.

**Assessment date:** 19 October 2026  
**System:** Teabag Booking Platform  
**Status key:** Implemented = present in repository; Partial = code exists but operational proof or policy is missing; Gap = not evidenced in the repository.

## Data classification and handling

| Data class | Booking platform examples | Who may access | Required handling | Current evidence / status |
|---|---|---|---|---|
| Public | Published provider display name, service description, category, public availability | Visitors and signed-in users | Publish only information the provider intended to make public | Active catalogue and public availability policies; **Partial** until deployed data and storage are reviewed |
| Private | Customer name, email, phone, own bookings, booking dates, provider schedules, waitlist entries | Customer for own records; assigned provider for operational booking; role-gated administrators | RLS, least privilege, authenticated access, documented retention | Supabase roles and RLS policies; export and deletion request paths; **Partial** pending production policy review and access testing |
| Confidential | Internal provider/customer operations, audit events, security activity, operational analytics | Admin or security admin with a work need; assigned provider only where needed | Limit staff access, log sensitive changes, protect exports | Audit events and restricted AI/security tables; read-access auditing is incomplete; **Partial** |
| Restricted | Passwords, authentication tokens, service-role keys, blockchain signing keys, RPC secrets; any payment credentials/documents if introduced | Credential owner or authorized server process only | Never expose in browser, source control, public storage, or chain; rotate and restrict secrets | `.env` excluded; docs direct server secrets to Supabase/Vercel; legacy payment bucket needs review; **Partial** |
| Special-category data (where applicable) | Health-related information could be inferred from a healthcare booking | Only parties with a justified service need | Avoid collecting clinical details; assess Article 9 condition and safeguards before handling health information | Current form collects visit mode only; no clinical record integration; **Gap** for any real health data processing |

## GDPR control assessment

| GDPR principle / right | Relevant implementation | Status | Evidence to retain or action required | Owner |
|---|---|---|---|---|
| Lawfulness, fairness, transparency (Arts. 5, 6, 12–14) | Privacy notice, notice acceptance, separate optional marketing choice | Partial | Insert legal entity/contact details, purposes, lawful bases, recipients, retention, international transfers, and rights contact; validate wording for actual processing | Data controller |
| Purpose limitation and data minimization (Art. 5) | Booking fields are limited to account/contact and service-specific booking details; AI uses daily aggregates | Partial | Approve a field-by-field purpose inventory; prevent sensitive notes and unnecessary health/payment data; preserve an aggregate-only AI export | Product owner |
| Accuracy (Art. 5) | Customers can manage account/booking requests; staff update booking status | Partial | Document correction process and show how incorrect booking data is corrected in operational records | Data controller / support |
| Storage limitation (Art. 5) | Deletion requests can be submitted and reviewed | Gap | Define retention periods by record type and a deletion/anonymization schedule; configure backups and logs consistently; document legal holds | Data controller |
| Integrity, confidentiality, and access control (Arts. 5, 25, 32) | Supabase RLS, role checks, separate security workspace hostname, server-only secrets | Partial | Deploy reviewed migrations; verify grants, storage policies, MFA, secret rotation, TLS, backups, incident response, and access logs in production | Security owner |
| Data subject access and portability (Arts. 15, 20) | Account export function | Partial | Verify export completeness, identity checks, response workflow, and export protection/deletion | Support / privacy owner |
| Rectification (Art. 16) | Customer can update contact fields; booking status functions are controlled | Partial | Define a request route for corrections to booking history and admin-held records | Support / privacy owner |
| Erasure and restriction (Arts. 17–18) | Deletion request UI and security-admin review workflow; deletion edge function exists | Partial | Set criteria for approval/denial, exceptions and response times; test deletion across related tables, storage, logs, backups, and processors | Privacy owner |
| Objection and consent withdrawal (Arts. 7, 21) | Marketing choice recorded separately | Partial | Add an operational unsubscribe/withdrawal path and ensure it stops marketing processing | Marketing owner |
| Processor contracts and transfers (Arts. 28, 44–49) | Supabase and Vercel are deployment/service dependencies | Gap | Record provider locations, DPA terms, subprocessors, transfer mechanism, and configuration | Data controller |
| Breach response (Arts. 33–34) | Audit events cover selected booking and role actions | Gap | Establish incident triage, regulator notification decision timeline, affected-person notices, and incident register | Security owner |
| Accountability and records (Arts. 5(2), 30) | Security and privacy documentation exists | Gap | Maintain processing record, approvals, risk assessment, staff training, and evidence of periodic review | Data controller |
| DPIA / high-risk review (Art. 35) | No DPIA evidence in repository | Gap | Assess whether systematic monitoring, sensitive health data, or other high-risk processing triggers a DPIA before launch | Data controller |
| Automated decision-making (Art. 22) | AI forecasts aggregate booking demand; they are not customer-level decisions | Implemented in design | Keep forecasts operational and aggregate; document human oversight and do not use synthetic model scores as production evidence | Product owner |
| Blockchain and erasure implications | On-chain records are non-identifying hashes and metadata; booking details remain off-chain | Partial | Review re-identification risk, hash persistence, retention/deletion interaction, chain/network, and public verification exposure before enabling production proofs | Security / privacy owner |

## Deployment readiness evidence

| Check | Result | Evidence / next step |
|---|---|---|
| Data classification documented | Done in this document | Review against the deployed schema and actual data |
| Role and module permissions documented | Done in `security-and-permissions.md` | Validate database grants and policies in the production Supabase project |
| Separate security domain supported | Code/configuration present | Add the security hostname as a Vercel domain and set `VITE_SECURITY_HOST` to that hostname at build time |
| User privacy notice present | Partial | Complete controller identity, contact, lawful bases, retention and rights content before launch |
| Data export / deletion request paths present | Partial | Test end-to-end and establish response procedures |
| Retention schedule | Gap | Create and implement an approved schedule |
| GDPR spreadsheet deliverable | Done as Markdown table | Convert to spreadsheet if lecturer requires `.xlsx` specifically |
| Legal compliance determination | Not assessed | Must be made by the data controller with qualified advice where needed |
