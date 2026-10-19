import { supabase } from './supabase'

/** Submit a non-PII commitment after the booking transaction has committed. */
export async function recordBookingProof(bookingId, eventType) {
  const { data, error } = await supabase.functions.invoke('record-booking-proof', {
    body: { booking_id: bookingId, event_type: eventType },
  })
  if (error) throw error
  return data
}
