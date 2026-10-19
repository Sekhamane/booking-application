import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { bookingDetailEntries } from '../../lib/bookingDetails'

export default function BookingSuccess({ booking }) {
  return <section style={{ padding: '60px 0 40px', textAlign: 'center', color: '#233238' }}>
    <CheckCircle2 size={56} color="#247468" style={{ marginBottom: 18 }} />
    <p style={{ color: '#247468', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 700 }}>Booking request received</p>
    <h1 style={{ fontSize: 38, margin: '10px 0' }}>You’re on your way.</h1>
    <p style={{ color: '#526267' }}>The provider will review your request. Track updates from your account.</p>
    <div style={{ maxWidth: 480, margin: '28px auto', padding: 22, textAlign: 'left', borderRadius: 10, border: '1px solid #dce5e0', background: '#fff' }}>
      <p><strong>Reference:</strong> {booking.reference_code}</p>
      <p><strong>Service:</strong> {booking.service?.name}</p>
      <p><strong>Provider:</strong> {booking.service?.provider_profiles?.display_name || 'Service provider'}</p>
      <p><strong>Date:</strong> {format(booking.date, 'EEEE, MMMM d, yyyy')}</p>
      <p><strong>Time:</strong> {booking.slot?.label}</p>
      <p><strong>Price:</strong> {Number(booking.price).toLocaleString()} {booking.currency || 'ZAR'}</p>
      <p style={{ marginBottom: 0 }}><strong>Status:</strong> {booking.status}</p>
      {bookingDetailEntries(booking.booking_details).map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}
    </div>
    <Link className="btn btn-primary" to="/account/bookings">View my bookings</Link>
    <p style={{ marginTop: 18 }}><Link to={`/verify/${encodeURIComponent(booking.reference_code)}`}>Verify booking record</Link></p>
    {!booking.proofRecorded && <p style={{ color: '#8a5a25', fontSize: 13 }}>The booking was saved. Its blockchain proof may take a little time to appear.</p>}
  </section>
}
