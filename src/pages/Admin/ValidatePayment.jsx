import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import { recordBookingProof } from '../../lib/blockchain'
import { bookingDetailEntries } from '../../lib/bookingDetails'

export default function ValidatePayment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('bookings')
      .select('id, reference_code, booking_date, status, price_per_side, price_currency, customer_notes, booking_details, customers(name, phone, email), services(name), provider_profiles(display_name), time_slots(label)')
      .eq('id', id).maybeSingle()
      .then(({ data, error }) => { if (error) toast.error('Unable to load booking.'); setBooking(data); setLoading(false) })
  }, [id])

  const update = async status => {
    setBusy(true)
    const { error } = await supabase.rpc('admin_update_booking_status', { p_booking_id: id, p_status: status, p_reason: status === 'rejected' ? 'Request declined by administrator' : null })
    setBusy(false)
    if (error) toast.error(error.message)
    else {
      toast.success(`Booking ${status}.`)
      try { await recordBookingProof(id, status) } catch (proofError) { console.error('Unable to record booking status proof', proofError) }
      navigate('/admin/bookings')
    }
  }

  if (loading) return <Spinner />
  if (!booking) return <p>Booking not found.</p>

  return <main style={{ maxWidth: 780, color: '#233238' }}>
    <p style={{ color: '#247468', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11 }}>Booking request</p>
    <h1 style={{ fontSize: 32 }}>{booking.reference_code}</h1>
    <section style={{ padding: 24, background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}>
      {[['Customer', booking.customers?.name], ['Phone', booking.customers?.phone], ['Email', booking.customers?.email], ['Service', booking.services?.name], ['Provider', booking.provider_profiles?.display_name], ['Date', booking.booking_date], ['Time', booking.time_slots?.label], ['Price', `${booking.price_currency} ${Number(booking.price_per_side).toFixed(2)}`], ['Status', booking.status], ['Notes', booking.customer_notes]].map(([label, value]) => <p key={label}><strong>{label}:</strong> {value || '—'}</p>)}
      {bookingDetailEntries(booking.booking_details).map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}
    </section>
    {booking.status === 'requested' && <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
      <button className="btn btn-primary" disabled={busy} onClick={() => update('confirmed')}>Confirm request</button>
      <button className="btn btn-secondary" disabled={busy} onClick={() => update('rejected')}>Decline request</button>
    </div>}
  </main>
}
