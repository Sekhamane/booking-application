import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const activeStatuses = ['requested', 'pending_validation', 'confirmed', 'in_progress']
const card = { padding: 20, border: '1px solid #d5e1dc', borderRadius: 12, background: '#fff' }
const actionLink = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 42, padding: '9px 15px', border: '1px solid #aabeb6', borderRadius: 7, color: '#14544e', background: '#fff', fontWeight: 600, textDecoration: 'none' }

export default function ProviderHome() {
  const { session, profile, loading, signOut } = useAuth()
  const [provider, setProvider] = useState(null)
  const [summary, setSummary] = useState({ services: 0, activeServices: 0, slots: 0, review: 0, upcoming: [], waitlist: 0 })
  const [dashboardLoading, setDashboardLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    if (!session?.user || isOffline) { setDashboardLoading(false); return }
    setDashboardLoading(true)
    const { data: providerRow, error: providerError } = await supabase.from('provider_profiles')
      .select('id, display_name, description, is_active').eq('profile_id', session.user.id).maybeSingle()
    if (providerError) {
      toast.error('Could not load your provider profile.')
      setDashboardLoading(false)
      return
    }
    setProvider(providerRow)
    if (!providerRow) { setDashboardLoading(false); return }

    const today = format(new Date(), 'yyyy-MM-dd')
    const [servicesResult, slotsResult, reviewResult, upcomingResult, waitlistResult] = await Promise.all([
      supabase.from('services').select('id, is_active').eq('provider_id', providerRow.id),
      supabase.from('provider_availability').select('id').eq('provider_id', providerRow.id).eq('is_available', true),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('provider_id', providerRow.id).in('status', ['requested', 'pending_validation']),
      supabase.from('bookings').select('id, reference_code, booking_date, status, customers(name), services(name), time_slots(label)')
        .eq('provider_id', providerRow.id).gte('booking_date', today).in('status', activeStatuses)
        .order('booking_date', { ascending: true }).limit(5),
      supabase.from('waitlist').select('id', { count: 'exact', head: true }).eq('notified', false),
    ])
    if ([servicesResult, slotsResult, reviewResult, upcomingResult, waitlistResult].some(result => result.error)) {
      console.error('Unable to load provider dashboard metrics')
      toast.error('Some dashboard information could not be loaded. Refresh to try again.')
    }
    const services = servicesResult.data || []
    setSummary({
      services: services.length,
      activeServices: services.filter(service => service.is_active).length,
      slots: (slotsResult.data || []).length,
      review: reviewResult.count || 0,
      upcoming: upcomingResult.data || [],
      waitlist: waitlistResult.count || 0,
    })
    setDashboardLoading(false)
  }, [session?.user])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  if (loading) return <main style={{ margin: '142px auto 80px', textAlign: 'center', color: '#203238' }}>Loading account...</main>
  if (!session) return <Navigate to="/account" replace />
  if (profile?.role !== 'provider') return <Navigate to="/account" replace />
  if (isOffline) return <main style={{ maxWidth: 900, margin: '142px auto 80px', padding: 24, color: '#203238' }}><h1>Provider workspace</h1><p>Connect Supabase to load and manage provider information.</p></main>

  const setupItems = [
    { label: 'Provider account approved', done: !!provider?.is_active, to: '/provider' },
    { label: 'Add and publish a service with a price', done: summary.activeServices > 0, to: '/provider/services' },
    { label: 'Set weekly availability', done: summary.slots > 0, to: '/provider/availability' },
  ]

  return <main style={{ maxWidth: 1100, margin: '142px auto 80px', padding: 24, color: '#203238' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <p style={{ color: '#526267', margin: '0 0 6px' }}>Provider workspace</p>
        <h1 style={{ fontSize: 36, margin: 0 }}>{provider?.display_name || profile.full_name || 'Your provider account'}</h1>
        <p style={{ color: provider?.is_active ? '#176b63' : '#704b12', fontWeight: 600, margin: '10px 0 0' }}>
          {provider?.is_active ? 'Your provider account is active and can accept booking requests.' : 'Your provider account is waiting for administrator approval.'}
        </p>
      </div>
      <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
    </div>

    {provider?.description && <p style={{ color: '#40565b', marginTop: 18, maxWidth: 720 }}>{provider.description}</p>}

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12, marginTop: 26 }}>
      {[
        ['Published services', `${summary.activeServices} / ${summary.services}`, '/provider/services'],
        ['Weekly time slots', summary.slots, '/provider/availability'],
        ['Bookings to review', summary.review, '/provider/bookings'],
        ['Waiting customers', summary.waitlist, '/provider/waitlist'],
      ].map(([label, value, to]) => <Link key={label} to={to} style={{ ...card, color: '#203238', textDecoration: 'none' }}><span style={{ display: 'block', color: '#526267', fontSize: 13 }}>{label}</span><strong style={{ display: 'block', marginTop: 7, fontSize: 27 }}>{dashboardLoading ? '...' : value}</strong></Link>)}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 22 }}>
      <section style={card}>
        <h2 style={{ margin: '0 0 14px', fontSize: 20 }}>Get ready to take bookings</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {setupItems.map(item => <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: item.done ? '#176b63' : '#526267', fontWeight: item.done ? 600 : 400 }}>{item.done ? '✓' : '○'} {item.label}</span>
            {!item.done && item.to !== '/provider' && <Link to={item.to} style={{ color: '#14544e', fontWeight: 600, whiteSpace: 'nowrap' }}>Set up</Link>}
          </div>)}
        </div>
        {!provider?.is_active && <p style={{ color: '#704b12', background: '#fff7e6', padding: 12, borderRadius: 7, lineHeight: 1.5, margin: '16px 0 0' }}>An administrator must approve your provider account before customers can see your services or book them.</p>}
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Upcoming bookings</h2><Link to="/provider/bookings" style={{ color: '#14544e', fontWeight: 600 }}>All bookings</Link>
        </div>
        {dashboardLoading ? <p style={{ color: '#526267', marginTop: 18 }}>Loading bookings...</p> : summary.upcoming.length ? <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {summary.upcoming.map(booking => <article key={booking.id} style={{ borderTop: '1px solid #e3ebe7', paddingTop: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{booking.services?.name || 'Service'}</strong><span style={{ color: '#526267', fontSize: 13 }}>{booking.status.replaceAll('_', ' ')}</span></div>
            <p style={{ margin: '5px 0 0', color: '#40565b', fontSize: 14 }}>{format(new Date(`${booking.booking_date}T00:00:00`), 'EEE, MMM d')} · {booking.time_slots?.label || 'Time pending'} · {booking.customers?.name || 'Customer'}</p>
            <small style={{ color: '#526267' }}>{booking.reference_code}</small>
          </article>)}
        </div> : <p style={{ color: '#526267', marginTop: 18 }}>No upcoming bookings. Keep your services and availability up to date so customers can make requests.</p>}
      </section>
    </div>

    <section style={{ ...card, marginTop: 18 }}>
      <h2 style={{ margin: '0 0 14px', fontSize: 20 }}>Manage your business</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link style={actionLink} to="/provider/services">Services and prices</Link>
        <Link style={actionLink} to="/provider/availability">Working hours and time off</Link>
        <Link style={actionLink} to="/provider/bookings">Bookings and reports</Link>
        <Link style={actionLink} to="/provider/waitlist">Waitlist</Link>
      </div>
    </section>
  </main>
}
