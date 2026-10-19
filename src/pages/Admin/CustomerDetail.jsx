import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { Crown } from 'lucide-react'

const STATUS_MAP = {
  pending_slip: { variant: 'neutral', label: 'Pending Slip' },
  pending_validation: { variant: 'amber', label: 'Pending Review' },
  confirmed: { variant: 'green', label: 'Confirmed' },
  rejected: { variant: 'red', label: 'Rejected' },
  completed: { variant: 'green', label: 'Completed' },
}

export default function CustomerDetail({ customer }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('bookings').select('*, services(*), time_slots(*)')
      .eq('customer_id', customer.id).order('booking_date', { ascending: false })
      .then(({ data }) => { setBookings(data || []); setLoading(false) })
  }, [customer.id])

  return (
    <div>
      {/* Customer info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, padding: 16, background: '#FAF7F2', borderRadius: 10 }}>
        {[
          { label: 'Phone', value: customer.phone },
          { label: 'Email', value: customer.email },
          { label: 'Total Bookings', value: customer.total_bookings },
          { label: 'Status', value: customer.is_recurring ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Crown size={13} color="#14544e" /> Recurring</span> : 'New' },
        ].map(r => (
          <div key={r.label}>
            <div style={{ fontFamily: '"DM Sans"', fontSize: 10, color: '#69462F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#2C1A0E' }}>{r.value}</div>
          </div>
        ))}
      </div>

      <h4 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 20, color: '#2C1A0E', marginBottom: 12 }}>Booking History</h4>

      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings.map(b => {
            const badge = STATUS_MAP[b.status] || { variant: 'neutral', label: b.status }
            return (
              <div key={b.id} style={{ padding: '14px 16px', background: '#fff', borderRadius: 8, border: '1px solid rgba(44,26,14,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 600, color: '#14544e' }}>{b.reference_code}</div>
                  <div style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#2C1A0E' }}>{b.services?.name}</div>
                  <div style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#69462F' }}>{b.booking_date} · {b.time_slots?.label}</div>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            )
          })}
          {!bookings.length && <p style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#69462F' }}>No bookings yet.</p>}
        </div>
      )}
    </div>
  )
}
