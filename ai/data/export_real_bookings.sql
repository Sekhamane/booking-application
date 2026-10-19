-- Run in the Supabase SQL editor as an authorized operator, then download CSV.
-- This deliberately exports aggregate counts only, without customer or booking IDs.
-- Use broad service category instead of individual service names to reduce inference risk.
select
  b.booking_date,
  coalesce(s.category, 'general') as category,
  coalesce(ts.label, 'unspecified') as time_period,
  count(*)::integer as booking_count
from public.bookings b
join public.services s on s.id = b.service_id
join public.time_slots ts on ts.id = b.slot_id
where b.status in ('requested', 'pending_validation', 'confirmed', 'in_progress', 'completed')
group by b.booking_date, coalesce(s.category, 'general'), coalesce(ts.label, 'unspecified')
order by b.booking_date, category, time_period;
