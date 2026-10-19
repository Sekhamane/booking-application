import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { recordBookingProof } from '../../lib/blockchain'
import { bookingDetailEntries } from '../../lib/bookingDetails'

const card = { background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 18 }

function toCsv(rows) {
  const columns = [
    ['Reference', row => row.reference_code],
    ['Service', row => row.services?.name],
    ['Category', row => row.services?.category],
    ['Date', row => row.booking_date],
    ['Time', row => row.time_slots?.label],
    ['Status', row => row.status],
    ['Currency', row => row.price_currency],
    ['Price', row => row.price_per_side],
  ]
  const escape = value => {
    const text = String(value ?? '')
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  return [columns.map(([label]) => escape(label)).join(','), ...rows.map(row => columns.map(([, value]) => escape(value(row))).join(','))].join('\r\n')
}

export default function ProviderBookings() {
  const { session } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [period, setPeriod] = useState('all')

  const load = useCallback(async () => {
    if (!session?.user || isOffline) { setLoading(false); return }
    setLoading(true)
    const { data: provider, error: providerError } = await supabase.from('provider_profiles')
      .select('id').eq('profile_id', session.user.id).maybeSingle()
    if (providerError || !provider) {
      toast.error(providerError ? 'Unable to load your provider profile.' : 'Your provider profile has not been provisioned yet.')
      setBookings([])
      setLoading(false)
      return
    }
    const rows = []
    let customerDetailsUnavailable = false
    for (let from = 0; ; from += 1000) {
      const fetchPage = includeCustomer => supabase.from('bookings')
        .select(`id, reference_code, service_id, booking_date, status, price_per_side, price_currency, customer_notes, booking_details, ${includeCustomer ? 'customers(name, phone, email),' : ''} services(name, category), time_slots(label)`)
        .eq('provider_id', provider.id)
        .order('booking_date', { ascending: true }).order('id', { ascending: true })
        .range(from, from + 999)
      let { data, error } = await fetchPage(true)
      if (error?.code === '42P01') {
        const fallback = await fetchPage(false)
        data = fallback.data
        error = fallback.error
        customerDetailsUnavailable = !error
      }
      if (error) {
        toast.error(error.code === '42P01'
          ? 'The booking database is missing its customers table. Run supabase/migrations/008_restore_customers_relation.sql in the Supabase SQL Editor.'
          : error.message || 'Unable to load bookings.')
        setBookings([])
        setLoading(false)
        return
      }
      rows.push(...(data || []))
      if (!data || data.length < 1000) break
    }
    setBookings(rows)
    if (customerDetailsUnavailable) toast('Bookings loaded. Customer contact details will appear after the database repair is applied.')
    setLoading(false)
  }, [session])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  const updateStatus = async (booking, status) => {
    setBusyId(booking.id)
    const { error } = await supabase.rpc('provider_update_booking_status', { p_booking_id: booking.id, p_status: status })
    setBusyId(null)
    if (error) toast.error(error.message)
    else {
      toast.success('Booking updated.')
      try { await recordBookingProof(booking.id, status) } catch (proofError) { console.error('Unable to record booking status proof', proofError) }
      load()
    }
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to manage bookings.</main>
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  if (period === 'next30') end.setDate(end.getDate() + 30)
  if (period === 'next90') end.setDate(end.getDate() + 90)
  const periodBookings = bookings.filter(item => {
    if (period === 'all') return true
    const bookingDate = new Date(`${item.booking_date}T00:00:00`)
    if (period === 'past30') { const lower = new Date(start); lower.setDate(lower.getDate() - 30); return bookingDate >= lower && bookingDate < start }
    return bookingDate >= start && bookingDate < end
  })
  const count = status => periodBookings.filter(item => item.status === status).length
  const byService = Object.values(periodBookings.reduce((groups, booking) => {
    const id = booking.service_id || `unknown-${booking.id}`
    const name = booking.services?.name || 'Service'
    groups[id] ||= { id, name, category: booking.services?.category, bookings: 0, value: {} }
    groups[id].bookings += 1
    if (['confirmed', 'in_progress', 'completed'].includes(booking.status)) {
      const currency = booking.price_currency || 'ZAR'
      groups[id].value[currency] = (groups[id].value[currency] || 0) + Number(booking.price_per_side || 0)
    }
    return groups
  }, {})).sort((a, b) => b.bookings - a.bookings)
  const exportReport = () => {
    const blob = new Blob([toCsv(periodBookings)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `teabag-provider-bookings-${period}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return <main style={{ maxWidth: 1100, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Bookings and reports</h1>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '20px 0' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Report period
        <select value={period} onChange={event => setPeriod(event.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #bdcbc5', background: '#fff', color: '#233238' }}>
          <option value="all">All bookings</option><option value="next30">Next 30 days</option><option value="next90">Next 90 days</option><option value="past30">Previous 30 days</option>
        </select>
      </label>
      <button className="btn btn-secondary" onClick={exportReport} disabled={loading || !periodBookings.length}>Download CSV report</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
      {[["Bookings", periodBookings.length], ['Requested', count('requested')], ['Confirmed', count('confirmed')], ['Completed', count('completed')]].map(([label, value]) => <section key={label} style={card}><span style={{ color: '#526267', fontSize: 13 }}>{label}</span><strong style={{ display: 'block', fontSize: 26, marginTop: 5 }}>{value}</strong></section>)}
    </div>
    <section style={{ ...card, marginBottom: 22 }}>
      <h2 style={{ marginTop: 0 }}>Bookings by service</h2>
      {byService.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead><tr>{['Service', 'Category', 'Bookings', 'Confirmed / completed value'].map(label => <th key={label} style={{ padding: '10px 8px', borderBottom: '1px solid #dce5e0', color: '#40565b' }}>{label}</th>)}</tr></thead>
        <tbody>{byService.map(row => <tr key={row.id}><td style={{ padding: '10px 8px' }}>{row.name}</td><td style={{ padding: '10px 8px' }}>{row.category || '—'}</td><td style={{ padding: '10px 8px' }}>{row.bookings}</td><td style={{ padding: '10px 8px' }}>{Object.entries(row.value).length ? Object.entries(row.value).map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`).join(' · ') : '—'}</td></tr>)}</tbody>
      </table></div> : <p style={{ color: '#526267', marginBottom: 0 }}>No bookings in this period.</p>}
      <p style={{ color: '#526267', fontSize: 12, marginBottom: 0 }}>Value includes confirmed, in-progress, and completed bookings; currencies are reported separately.</p>
    </section>
    <h2>Booking schedule</h2>
    {loading ? <p>Loading…</p> : <div style={{ display: 'grid', gap: 12 }}>{periodBookings.map(booking => <article key={booking.id} style={{ padding: 18, border: '1px solid #dce5e0', background: '#fff', borderRadius: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div><strong>{booking.services?.name || 'Service'} · {booking.reference_code}</strong><p style={{ margin: '7px 0' }}>{booking.booking_date} · {booking.time_slots?.label || 'Time'} · {booking.status}</p>
          <p style={{ margin: '6px 0' }}>Customer: {booking.customers?.name ? `${booking.customers.name} · ${booking.customers.phone || '—'} · ${booking.customers.email || '—'}` : 'Contact details unavailable'}</p>
          {!!bookingDetailEntries(booking.booking_details).length && <p style={{ color: '#40565b' }}>Request details: {bookingDetailEntries(booking.booking_details).map(([label, value]) => `${label}: ${value}`).join(' · ')}</p>}
          {booking.customer_notes && <p style={{ color: '#526267' }}>Notes: {booking.customer_notes}</p>}
          <strong>{booking.price_currency} {Number(booking.price_per_side).toFixed(2)}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {booking.status === 'requested' && <><button disabled={busyId === booking.id} className="btn btn-primary" onClick={() => updateStatus(booking, 'confirmed')}>Confirm</button><button disabled={busyId === booking.id} className="btn btn-secondary" onClick={() => updateStatus(booking, 'rejected')}>Decline</button></>}
          {booking.status === 'confirmed' && <button disabled={busyId === booking.id} className="btn btn-primary" onClick={() => updateStatus(booking, 'in_progress')}>Start service</button>}
          {booking.status === 'in_progress' && <button disabled={busyId === booking.id} className="btn btn-primary" onClick={() => updateStatus(booking, 'completed')}>Mark complete</button>}
        </div>
      </div>
    </article>)}{!periodBookings.length && <p>No bookings in this period.</p>}</div>}
  </main>
}
