import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const empty = { name: '', category: 'general', description: '', duration: 60, price: '', currency: 'ZAR' }

export default function ProviderServices() {
  const { session } = useAuth()
  const [provider, setProvider] = useState(null)
  const [services, setServices] = useState([])
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session?.user || isOffline) { setLoading(false); return }
    setLoading(true)
    const { data: profile, error: profileError } = await supabase.from('provider_profiles').select('id, is_active').eq('profile_id', session.user.id).maybeSingle()
    if (profileError) { toast.error('Unable to load your provider profile.'); setLoading(false); return }
    setProvider(profile)
    if (!profile) { setLoading(false); return }
    const { data, error } = await supabase.from('services').select('id, name, slug, category, currency, description, duration_minutes, coverage_levels, is_active')
      .eq('provider_id', profile.id).order('name')
    if (error) toast.error('Unable to load services.')
    else {
      const serviceRows = data || []
      const { data: bookingRows, error: bookingError } = await supabase.from('bookings')
        .select('service_id, status, booking_date')
        .eq('provider_id', profile.id)
      if (bookingError) toast.error('Services loaded, but booking counts could not be refreshed.')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const bookingsByService = (bookingRows || []).reduce((groups, booking) => {
        const stats = groups[booking.service_id] || { total: 0, upcoming: 0, requested: 0 }
        stats.total += 1
        if (booking.booking_date >= todayKey && !['cancelled', 'rejected', 'expired'].includes(booking.status)) stats.upcoming += 1
        if (booking.status === 'requested') stats.requested += 1
        groups[booking.service_id] = stats
        return groups
      }, {})
      setServices(serviceRows.map(service => ({ ...service, booking_stats: bookingError ? null : bookingsByService[service.id] || { total: 0, upcoming: 0, requested: 0 } })))
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  const save = async event => {
    event.preventDefault()
    if (!provider) { toast.error('Your provider profile has not been provisioned.'); return }
    const normalizedName = form.name.trim().toLocaleLowerCase()
    if (services.some(service => service.category === form.category && service.name.trim().toLocaleLowerCase() === normalizedName)) {
      toast.error('You already have a service with this name and category. Give each service a distinct name so its bookings are easy to track.')
      return
    }
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      slug: `${form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service'}-${crypto.randomUUID()}`,
      category: form.category,
      description: form.description.trim(),
      duration_minutes: Number(form.duration),
      currency: form.currency,
      coverage_levels: [{ level: 1, label: 'Standard', price: Number(form.price) }],
      provider_id: provider.id,
      is_bridal: false,
      is_active: provider.is_active,
    }
    const { error } = await supabase.from('services').insert(payload)
    setBusy(false)
    if (error) {
      if (error.code === '42501') toast.error('Service draft permissions are not installed yet. Run supabase/migrations/007_provider_service_drafts.sql in the Supabase SQL Editor.')
      else toast.error(error.message)
    }
    else { toast.success(provider.is_active ? 'Service published.' : 'Draft saved. It will stay hidden until your account is approved and you publish it.'); setForm(empty); load() }
  }

  const toggle = async service => {
    if (!service.is_active && !provider?.is_active) {
      toast.error('Your provider account must be approved before you can publish services.')
      return
    }
    const { error } = await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id)
    if (error) toast.error(error.message)
    else load()
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to manage provider services.</main>
  return <main style={{ maxWidth: 1050, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Services and prices</h1>
    {!loading && !provider && <aside role="status" style={{ margin: '18px 0', padding: 16, color: '#49380d', background: '#fff7e6', border: '1px solid #e6d39b', borderRadius: 9 }}>Your provider profile has not been provisioned yet. Ask an administrator to assign you the provider role.</aside>}
    {provider && !provider.is_active && <aside role="status" style={{ margin: '18px 0', padding: 16, color: '#49380d', background: '#fff7e6', border: '1px solid #e6d39b', borderRadius: 9 }}><strong>Your provider account is awaiting approval.</strong><br />You can prepare service drafts now. They remain hidden from customers until an administrator approves your account and you publish them.</aside>}
    {provider && <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, padding: 20, background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}>
      <label>Service name<input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{[['flights','Flights'],['accommodation','Stays and accommodation'],['healthcare','Healthcare'],['general','Other services']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Duration (minutes)<input required type="number" min="5" max="1440" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></label>
      <label>Price<input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
      <label>Currency<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{['ZAR','USD','EUR','GBP'].map(currency => <option key={currency}>{currency}</option>)}</select></label>
      <label style={{ gridColumn: '1 / -1' }}>Description<textarea maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : provider.is_active ? "Add and publish service" : "Save service draft"}</button>
    </form>}
    <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
      {services.map(service => <article key={service.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', padding: 18, background: '#fff', border: '1px solid #dce5e0', borderRadius: 9 }}>
        <div><strong>{service.name}</strong><p style={{ color: "#526267", margin: "5px 0" }}>{service.category} · {service.duration_minutes} minutes · {service.coverage_levels?.[0]?.price} {service.currency} · {service.is_active ? "Published" : provider?.is_active ? "Paused" : "Draft"}</p><p style={{ color: '#40565b', margin: '6px 0 0', fontSize: 13 }}>{service.booking_stats ? <>{service.booking_stats.total} customer booking{service.booking_stats.total === 1 ? '' : 's'} · {service.booking_stats.upcoming} upcoming{service.booking_stats.requested ? ` · ${service.booking_stats.requested} awaiting response` : ''}</> : 'Booking counts unavailable'}</p></div>
        <button className="btn btn-secondary" disabled={!service.is_active && !provider?.is_active} onClick={() => toggle(service)}>{service.is_active ? "Pause" : provider?.is_active ? "Publish" : "Awaiting approval"}</button>
      </article>)}
      {loading && <p>Loading services...</p>}
      {!loading && provider && services.length === 0 && <p>You have not added a service yet. Use the form above to create your first listing.</p>}
    </div>
  </main>
}
