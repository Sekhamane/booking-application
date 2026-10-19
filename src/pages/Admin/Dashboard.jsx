import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth } from 'date-fns'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

const activeStatuses = ['requested', 'pending_slip', 'pending_validation', 'confirmed', 'in_progress']
const statusBadge = {
  requested: ['amber', 'Requested'], pending_slip: ['neutral', 'Requested'], pending_validation: ['amber', 'Awaiting review'],
  confirmed: ['green', 'Confirmed'], in_progress: ['green', 'In progress'], completed: ['green', 'Completed'],
  rejected: ['red', 'Declined'], cancelled: ['neutral', 'Cancelled'], expired: ['neutral', 'Expired'],
}
const card = { background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 18 }

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [stats, setStats] = useState({ review: 0, today: 0, confirmed: 0, customers: 0, providers: 0 })
  const [slots, setSlots] = useState([])
  const [todayBookings, setTodayBookings] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const [slotResult, todayResult, reviewResult, confirmedResult, customerResult, providerResult, recentResult] = await Promise.all([
        supabase.from('time_slots').select('id, label, display_time, sort_order').eq('is_active', true).order('sort_order'),
        supabase.from('bookings').select('slot_id, status').eq('booking_date', today).in('status', activeStatuses),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['requested', 'pending_validation']),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('booking_date', monthStart),
        supabase.from('customers').select('id', { count: 'exact', head: true }).not('profile_id', 'is', null),
        supabase.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('bookings').select('id, reference_code, status, booking_date, customers(name), services(name), provider_profiles(display_name), time_slots(label)')
          .order('created_at', { ascending: false }).limit(10),
      ])
      if (!active) return
      if ([slotResult, todayResult, reviewResult, confirmedResult, customerResult, providerResult, recentResult].some(result => result.error)) {
        console.error('Unable to load dashboard data')
      }
      setSlots(slotResult.data || [])
      setTodayBookings(todayResult.data || [])
      setStats({ review: reviewResult.count || 0, today: (todayResult.data || []).length, confirmed: confirmedResult.count || 0, customers: customerResult.count || 0, providers: providerResult.count || 0 })
      setRecent(recentResult.data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [today])

  if (loading) return <Spinner />
  const slotCounts = todayBookings.reduce((counts, booking) => {
    counts[booking.slot_id] = (counts[booking.slot_id] || 0) + 1
    return counts
  }, {})

  return <div style={{ color: '#233238' }}>
    <h1 style={{ fontSize: 32, marginBottom: 4 }}>Dashboard</h1>
    <p style={{ color: '#526267', marginTop: 0 }}>Today · {format(new Date(), 'MMMM d, yyyy')}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '20px 0 30px' }}>
      {[["Needs review", stats.review, '/admin/bookings'], ['Today’s bookings', stats.today, '/admin/bookings'], ['Confirmed this month', stats.confirmed, '/admin/bookings'], ['Customers', stats.customers, '/admin/customers'], ['Active providers', stats.providers, '/admin/providers']].map(([label, value, to]) => <Link key={label} to={to} style={{ ...card, display: 'block', color: '#203238', textDecoration: 'none' }}><span style={{ color: '#526267', fontSize: 12 }}>{label}</span><strong style={{ display: 'block', fontSize: 26, marginTop: 7 }}>{value}</strong></Link>)}
    </div>
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Quick actions</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {[["Review bookings", '/admin/bookings'], ['Manage providers', '/admin/providers'], ['View demand forecast', '/admin/ai'], ['Open analytics', '/admin/analytics']].map(([label, to]) => <Link key={to} to={to} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 42, padding: '9px 14px', borderRadius: 7, border: '1px solid #b8c9c2', background: '#fff', color: '#14544e', fontWeight: 600, textDecoration: 'none' }}>{label}</Link>)}
      </div>
    </section>
    <h2 style={{ fontSize: 20 }}>Today’s time slots</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 30 }}>
      {slots.map(slot => <section key={slot.id} style={card}><span style={{ color: '#526267', fontSize: 12 }}>{slot.display_time || slot.label}</span><strong style={{ display: 'block', marginTop: 8 }}>{slot.label}</strong><p style={{ color: '#526267', marginBottom: 0 }}>{slotCounts[slot.id] || 0} active booking{slotCounts[slot.id] === 1 ? '' : 's'}</p></section>)}
      {!slots.length && <p>No active time slots are configured.</p>}
    </div>
    <section style={{ ...card, padding: 0, overflowX: 'auto' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #e6ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ fontSize: 18, margin: 0 }}>Recent bookings</h2><Link to="/admin/bookings">View all</Link></div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Reference', 'Customer', 'Service', 'Provider', 'Date', 'Time', 'Status'].map(label => <th key={label} style={{ padding: 12, textAlign: 'left', color: '#526267', fontSize: 11 }}>{label}</th>)}</tr></thead>
        <tbody>{recent.map(booking => { const [variant, label] = statusBadge[booking.status] || ['neutral', booking.status]; return <tr key={booking.id} style={{ borderTop: '1px solid #e6ece9' }}>
          <td style={{ padding: 12 }}>{booking.reference_code}</td><td style={{ padding: 12 }}>{booking.customers?.name || '—'}</td><td style={{ padding: 12 }}>{booking.services?.name || '—'}</td><td style={{ padding: 12 }}>{booking.provider_profiles?.display_name || '—'}</td><td style={{ padding: 12 }}>{booking.booking_date}</td><td style={{ padding: 12 }}>{booking.time_slots?.label || '—'}</td><td style={{ padding: 12 }}><Badge variant={variant}>{label}</Badge></td>
        </tr> })}{recent.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#526267' }}>No bookings yet.</td></tr>}</tbody>
      </table>
    </section>
  </div>
}
