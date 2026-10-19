const labels = {
  origin: 'From',
  destination: 'Destination',
  trip_type: 'Trip type',
  travel_date: 'Travel date',
  return_date: 'Return date',
  travelers: 'Travelers',
  check_in: 'Check-in',
  check_out: 'Check-out',
  guests: 'Guests',
  rooms: 'Rooms',
  visit_mode: 'Visit type',
}

export function bookingDetailEntries(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return []
  return Object.entries(details)
    .filter(([key, value]) => labels[key] && value != null && value !== '')
    .map(([key, value]) => [labels[key], String(value).replaceAll('_', ' ')])
}
