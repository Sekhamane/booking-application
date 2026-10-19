-- Booking status RPCs use an empty search_path. The trigger they fire must
-- qualify its table references so confirmations can update customer stats.
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.customers
  SET
    total_bookings = (
      SELECT COUNT(*) FROM public.bookings
      WHERE customer_id = NEW.customer_id
        AND status IN ('confirmed', 'completed')
    ),
    is_recurring = (
      SELECT COUNT(*) > 1 FROM public.bookings
      WHERE customer_id = NEW.customer_id
        AND status IN ('confirmed', 'completed')
    ),
    updated_at = now()
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$;
