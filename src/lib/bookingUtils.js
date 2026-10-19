import { format, addDays } from 'date-fns'
import { ADVANCE_BOOKING_DAYS } from '../constants/services'

export function generateReferenceCode(date) {
  const dateStr = format(date, 'yyyyMMdd')
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  return `BKG-${dateStr}-${seq}`
}

export function getMinBookingDate() {
  return addDays(new Date(), ADVANCE_BOOKING_DAYS)
}

export function isSlotAvailable(slotId, date, bookings) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return !bookings.some(
    b =>
      b.slot_id === slotId &&
      b.booking_date === dateStr &&
      ['pending_slip', 'pending_validation', 'confirmed'].includes(b.status),
  )
}

export function formatPrice(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
