-- Small generic appointment increments. Providers choose which increments to offer.
-- This is only a starting schedule; it does not represent airline or hotel inventory.
INSERT INTO public.time_slots (label, time, display_time, is_active, sort_order)
SELECT
  to_char(timestamp '2000-01-01 08:00' + generated.minutes * interval '1 minute', 'HH24:MI'),
  to_char(timestamp '2000-01-01 08:00' + generated.minutes * interval '1 minute', 'HH24:MI'),
  to_char(timestamp '2000-01-01 08:00' + generated.minutes * interval '1 minute', 'FMHH12:MI AM'),
  true,
  generated.minutes / 30 + 1
FROM generate_series(0, 720, 30) AS generated(minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.time_slots existing
  WHERE existing.time = to_char(timestamp '2000-01-01 08:00' + generated.minutes * interval '1 minute', 'HH24:MI')
);
