const MOCK_BOOKINGS_KEY = 'app_mock_bookings'
const MOCK_VOUCHERS_KEY  = 'app_mock_vouchers'

const DEFAULT_BOOKINGS = [
  {
    id: 'mock-booking-1',
    reference_code: 'BKG-001',
    booking_date: '2026-06-16',
    status: 'pending_validation',
    occasion_type: 'bridal',
    price_per_side: 120,
    deposit_amount: 40,
    customer_notes: 'Please make it very detailed and intricate on both hands.',
    payment_slip_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    created_at: '2026-06-02T10:00:00Z',
    customers: { id: 'cust-1', name: 'Jane Smith', phone: '+1 555 123 4567', email: 'jane@example.com', created_at: '2026-06-02T10:00:00Z' },
    services: { id: 'bridal-intricate', name: 'Intricate Bridal', deposit_fee: 40 },
    time_slots: { id: 'slot-morning', label: 'Morning Slot (9:00 AM - 1:00 PM)' }
  },
  {
    id: 'mock-booking-2',
    reference_code: 'BKG-002',
    booking_date: '2026-06-18',
    status: 'confirmed',
    occasion_type: 'party',
    price_per_side: 60,
    deposit_amount: 20,
    customer_notes: 'Engagement party design.',
    payment_slip_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    created_at: '2026-06-02T11:15:00Z',
    customers: { id: 'cust-2', name: 'Alex Johnson', phone: '+1 555 987 6543', email: 'alex@example.com', created_at: '2026-06-02T11:15:00Z' },
    services: { id: 'party-henna', name: 'Party Guest', deposit_fee: 20 },
    time_slots: { id: 'slot-afternoon', label: 'Afternoon Slot (2:00 PM - 6:00 PM)' }
  },
  {
    id: 'mock-booking-3',
    reference_code: 'BKG-003',
    booking_date: '2026-06-20',
    status: 'pending_slip',
    occasion_type: 'bridal',
    price_per_side: 95,
    deposit_amount: 35,
    customer_notes: 'Bridal shower design.',
    payment_slip_url: null,
    created_at: '2026-06-02T12:30:00Z',
    customers: { id: 'cust-3', name: 'Maria Garcia', phone: '+1 555 333 4444', email: 'maria@example.com', created_at: '2026-06-02T12:30:00Z' },
    services: { id: 'arabic-bridal', name: 'Floral Arabic Bridal', deposit_fee: 35 },
    time_slots: { id: 'slot-morning', label: 'Morning Slot (9:00 AM - 1:00 PM)' }
  }
]

const DEFAULT_VOUCHERS = [
  {
    id: 'mock-voucher-1',
    code: 'GIFT-50',
    value: 50,
    status: 'active',
    recipient_name: 'Sarah Lee',
    recipient_email: 'sarah@example.com',
    sender_name: 'Chris Brown',
    created_at: '2026-06-01T08:00:00Z',
    services: { name: 'Gift Card $50' }
  },
  {
    id: 'mock-voucher-2',
    code: 'GIFT-100',
    value: 100,
    status: 'used',
    recipient_name: 'Diana Prince',
    recipient_email: 'diana@example.com',
    sender_name: 'Bruce Wayne',
    created_at: '2026-05-28T14:20:00Z',
    services: { name: 'Gift Card $100' }
  }
]

function getStored(key, defaults) {
  const item = localStorage.getItem(key)
  if (!item) {
    localStorage.setItem(key, JSON.stringify(defaults))
    return defaults
  }
  return JSON.parse(item)
}

function setStored(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function getMockBookings(filters = {}) {
  let list = getStored(MOCK_BOOKINGS_KEY, DEFAULT_BOOKINGS)

  if (filters.status) {
    list = list.filter(b => b.status === filters.status)
  }
  if (filters.date) {
    list = list.filter(b => b.booking_date === filters.date)
  }
  if (filters.customerId) {
    list = list.filter(b => b.customers?.id === filters.customerId)
  }

  return list
}

export function getMockBookingById(id) {
  const list = getStored(MOCK_BOOKINGS_KEY, DEFAULT_BOOKINGS)
  return list.find(b => b.id === id) || null
}

export function updateMockBookingStatus(id, status, extraFields = {}) {
  const list = getStored(MOCK_BOOKINGS_KEY, DEFAULT_BOOKINGS)
  const updated = list.map(b => {
    if (b.id === id) {
      return { ...b, status, ...extraFields, updated_at: new Date().toISOString() }
    }
    return b
  })
  setStored(MOCK_BOOKINGS_KEY, updated)
  return updated.find(b => b.id === id)
}

export function getMockCustomers(search = '') {
  const bookingsList = getStored(MOCK_BOOKINGS_KEY, DEFAULT_BOOKINGS)
  const customersMap = {}

  bookingsList.forEach(b => {
    if (b.customers) {
      customersMap[b.customers.id] = b.customers
    }
  })

  let list = Object.values(customersMap)

  if (search) {
    const s = search.toLowerCase()
    list = list.filter(c => 
      c.name.toLowerCase().includes(s) || 
      c.phone.toLowerCase().includes(s) || 
      c.email.toLowerCase().includes(s)
    )
  }

  return list
}

export function getMockVouchers() {
  return getStored(MOCK_VOUCHERS_KEY, DEFAULT_VOUCHERS)
}

export function getMockAnalytics() {
  const bookingsList = getStored(MOCK_BOOKINGS_KEY, DEFAULT_BOOKINGS)
  
  // Last 6 months revenues
  const revenue = [
    { month: 'Jan', revenue: 2450 },
    { month: 'Feb', revenue: 3200 },
    { month: 'Mar', revenue: 4150 },
    { month: 'Apr', revenue: 3800 },
    { month: 'May', revenue: 4950 },
    { month: 'Jun', revenue: bookingsList.filter(b => ['confirmed', 'completed'].includes(b.status)).reduce((acc, curr) => acc + curr.price_per_side, 0) }
  ]

  // Count by service
  const byService = [
    { name: 'Intricate Bridal', value: bookingsList.filter(b => b.services?.id === 'bridal-intricate').length },
    { name: 'Floral Arabic Bridal', value: bookingsList.filter(b => b.services?.id === 'arabic-bridal').length },
    { name: 'Party Guest', value: bookingsList.filter(b => b.services?.id === 'party-henna').length }
  ].filter(item => item.value > 0)

  // Count by slots
  const bySlot = [
    { name: 'Morning Slot (9:00 AM - 1:00 PM)', value: bookingsList.filter(b => b.time_slots?.id === 'slot-morning').length },
    { name: 'Afternoon Slot (2:00 PM - 6:00 PM)', value: bookingsList.filter(b => b.time_slots?.id === 'slot-afternoon').length }
  ].filter(item => item.value > 0)

  return { revenue, byService, bySlot }
}
