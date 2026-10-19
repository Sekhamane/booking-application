import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { recordBookingProof } from '../lib/blockchain'
import { bookingDetailEntries } from '../lib/bookingDetails'

export default function AccountBookings() {
  const { session, profile, loading } = useAuth()
  const [bookings, setBookings] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [privacyRequests, setPrivacyRequests] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [refreshing, setRefreshing] = useState(true)
  const [lastChecked, setLastChecked] = useState(null)

  const load = useCallback(async () => {
    if (!session?.user || isOffline) { setRefreshing(false); return }
    setRefreshing(true)
    try {
      const [{ data, error }, { data: requests }, { data: waiting, error: waitlistError }] = await Promise.all([supabase.from('bookings')
        .select('id, reference_code, booking_date, status, price_per_side, price_currency, booking_details, created_at, cancelled_at, services(name), time_slots(label), provider_profiles(display_name), booking_proofs(event_type)')
        .order('created_at', { ascending: false }),
        supabase.from('privacy_requests').select('id, request_type, status, requested_at').order('requested_at', { ascending: false }),
        supabase.from('waitlist').select('id, requested_date, notified, notified_at, claim_expires_at, claimed, created_at, services(name), time_slots(label)').order('created_at', { ascending: false })])
      if (error) toast.error('Could not load your bookings.')
      else setBookings(data || [])
      if (waitlistError) toast.error('Could not load your waitlist entries.')
      setPrivacyRequests(requests || [])
      setWaitlist(waiting || [])
      setLastChecked(new Date())
    } catch {
      toast.error('Could not refresh your bookings. Check your connection and try again.')
    } finally { setRefreshing(false) }
  }, [session])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  if (loading) return <main style={{ margin: '120px auto', textAlign: 'center' }}>Loading account…</main>
  if (!session) return <Navigate to="/account" replace />
  if (profile?.role !== 'customer') return <Navigate to="/account" replace />

  const cancel = async (id) => {
    setBusyId(id)
    const { error } = await supabase.rpc('cancel_my_booking', { p_booking_id: id, p_reason: 'Customer cancellation' })
    setBusyId(null)
    if (error) toast.error(error.message)
    else {
      toast.success('Booking cancelled.')
      try { await recordBookingProof(id, 'cancelled') } catch (proofError) { console.error('Unable to record cancellation proof', proofError) }
      load()
    }
  }

  const leaveWaitlist = async id => {
    if (!window.confirm('Remove this date and time from your waitlist?')) return
    setBusyId(id)
    const { error } = await supabase.rpc('leave_my_waitlist', { p_waitlist_id: id })
    setBusyId(null)
    if (error) toast.error(error.message || 'Unable to leave the waitlist.')
    else { toast.success('Removed from your waitlist.'); load() }
  }

  const exportData = async () => {
    const [
      { data: account, error: accountError },
      { data: customer, error: customerError },
      { data: history, error: historyError },
      { data: waitlist, error: waitlistError },
      { data: requests, error: requestsError },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, phone, preferred_language, created_at').eq('id', session.user.id).single(),
      supabase.from('customers').select('name, phone, email, preferred_language, total_bookings, is_recurring, occasion_dates, notes').eq('profile_id', session.user.id).maybeSingle(),
      supabase.from('bookings').select('reference_code, booking_date, status, price_per_side, price_currency, booking_details, occasion_type, customer_notes, cancellation_reason, created_at, services(name, category), time_slots(label), provider_profiles(display_name)').order('created_at', { ascending: false }),
      supabase.from('waitlist').select('requested_date, notified, notified_at, claim_expires_at, claimed, created_at, services(name), time_slots(label)').order('created_at', { ascending: false }),
      supabase.from('privacy_requests').select('request_type, status, requested_at, completed_at, admin_notes').order('requested_at', { ascending: false }),
    ])
    if ([accountError, customerError, historyError, waitlistError, requestsError].some(error => error)) { toast.error('Unable to prepare your export.'); return }
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), account: { ...account, email: session.user.email }, customer, bookings: history, waitlist, privacy_requests: requests }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'teabag-account-export.json'
    link.click()
    URL.revokeObjectURL(url)
    const { error: requestError } = await supabase.from('privacy_requests').insert({ profile_id: session.user.id, request_type: 'export' })
    if (requestError) toast.error('Export downloaded, but its request record could not be saved.')
  }

  const requestDeletion = async () => {
    if (!window.confirm('Submit a request to delete your account and associated personal data? The request will be reviewed before processing.')) return
    const { error } = await supabase.from('privacy_requests').insert({ profile_id: session.user.id, request_type: 'deletion' })
    if (error) toast.error('Unable to submit the request.')
    else toast.success('Deletion request submitted for review.')
  }

  const retryProof = async booking => {
    try {
      await recordBookingProof(booking.id, booking.status)
      toast.success('Blockchain proof recorded.')
      load()
    } catch { toast.error('Proof is not available yet. Try again later.') }
  }

  const statusDetails = {
    requested: ['Awaiting provider approval', 'The provider has received your request and has not approved or declined it yet.'],
    confirmed: ['Approved', 'Your provider approved this booking.'],
    rejected: ['Not approved', 'Your provider declined this booking. Contact them if you need more information.'],
    pending_slip: ['Awaiting payment details', 'Your request is waiting for payment information.'],
    pending_validation: ['Payment under review', 'Your payment information is being reviewed.'],
    in_progress: ['In progress', 'Your service is underway.'],
    completed: ['Completed', 'This booking is complete.'],
    cancelled: ['Cancelled', 'This booking was cancelled.'],
    expired: ['Expired', 'This booking has expired.'],
  }

  return (
    <main style={{ maxWidth: 960, margin: '120px auto 80px', padding: 24, color: '#233238' }}>
      <p style={{ color: '#526267' }}>Customer account</p>
      <h1 style={{ fontSize: 36 }}>Your bookings</h1>
      <p style={{ color: '#526267', marginTop: 6 }}>Check whether each request is awaiting approval, approved, or not approved. Refresh to check for the latest update.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={load} disabled={refreshing || isOffline}>{refreshing ? 'Checking...' : 'Refresh booking status'}</button>
        <button className="btn btn-secondary" onClick={exportData} disabled={isOffline}>Export my data</button>
        <button className="btn btn-secondary" onClick={requestDeletion} disabled={isOffline}>Request account deletion</button>
      </div>
      {lastChecked && <p role="status" style={{ color: '#526267', fontSize: 13, marginTop: 8 }}>Last checked {lastChecked.toLocaleTimeString()}</p>}
      {!!privacyRequests.length && <p style={{ color: '#526267' }}>Privacy requests: {privacyRequests.map(request => `${request.request_type} (${request.status})`).join(' · ')}</p>}
      {isOffline && <p>Connect Supabase to view bookings.</p>}
      {!isOffline && bookings.length === 0 && <p style={{ marginTop: 24 }}>No bookings yet. <Link to="/book">Explore services</Link>.</p>}
      <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
        {bookings.map(booking => (
          <article key={booking.id} style={{ padding: 20, border: '1px solid #dce3e3', borderRadius: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <strong>{booking.reference_code}</strong>
                <p style={{ margin: '8px 0 2px' }}>{booking.services?.name || 'Service'} · {booking.provider_profiles?.display_name || 'Provider'}</p>
                <p style={{ margin: 0, color: '#526267' }}>{booking.booking_date} · {booking.time_slots?.label || 'Time to be confirmed'}</p>
                {!!bookingDetailEntries(booking.booking_details).length && <p style={{ color: '#40565b' }}>{bookingDetailEntries(booking.booking_details).map(([label, value]) => `${label}: ${value}`).join(' · ')}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>{booking.price_currency} {booking.price_per_side}</strong>
                <p style={{ margin: '8px 0 4px', color: booking.status === 'confirmed' ? '#176b63' : booking.status === 'rejected' ? '#9a3f35' : '#805a16', fontWeight: 700 }}>{statusDetails[booking.status]?.[0] || booking.status.replaceAll('_', ' ')}</p>
                <p style={{ maxWidth: 260, color: '#526267', fontSize: 13, margin: '0 0 10px' }}>{statusDetails[booking.status]?.[1]}</p>
                {['requested', 'pending_slip', 'pending_validation', 'confirmed'].includes(booking.status) && (
                  <button disabled={busyId === booking.id} onClick={() => cancel(booking.id)} className="btn btn-secondary">
                    {busyId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                )}
                {!booking.booking_proofs?.some(proof => proof.event_type === booking.status) && ['requested', 'confirmed', 'rejected', 'cancelled', 'in_progress', 'completed'].includes(booking.status) && (
                  <button className="btn btn-secondary" onClick={() => retryProof(booking)}>Retry proof</button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      <section style={{ marginTop: 38 }}>
        <h2>My waitlist</h2>
        <p style={{ color: '#526267' }}>Waitlist entries are requests only. A time is reserved after you submit a booking and the provider confirms it.</p>
        {isOffline ? <p>Connect Supabase to view your waitlist.</p> : waitlist.length === 0 ? <p>You are not waiting for any dates or times.</p> : <div style={{ display: 'grid', gap: 10 }}>
          {waitlist.map(entry => {
            const expired = entry.claim_expires_at && new Date(entry.claim_expires_at) < new Date()
            const status = entry.claimed ? 'Marked claimed by provider' : entry.notified ? expired ? 'Contact window expired' : `Provider contacted you${entry.claim_expires_at ? ` · respond by ${new Date(entry.claim_expires_at).toLocaleString()}` : ''}` : 'Waiting for provider'
            return <article key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: 16, background: '#fff', border: '1px solid #dce5e0', borderRadius: 9 }}>
              <div><strong>{entry.services?.name || 'Service'}</strong><p style={{ margin: '6px 0', color: '#40565b' }}>{entry.requested_date} · {entry.time_slots?.label || 'Requested time'}</p><span style={{ color: '#526267', fontSize: 13 }}>{status}{entry.notified_at ? ` · Contacted ${new Date(entry.notified_at).toLocaleString()}` : ''}</span></div>
              <button className="btn btn-secondary" disabled={busyId === entry.id || isOffline} onClick={() => leaveWaitlist(entry.id)}>{busyId === entry.id ? 'Removing…' : 'Leave waitlist'}</button>
            </article>
          })}
        </div>}
      </section>
    </main>
  )
}
