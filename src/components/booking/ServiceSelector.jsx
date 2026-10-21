import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase, isOffline } from '../../lib/supabase'

const categoryLabel = { flights: 'Flights', accommodation: 'Stays', healthcare: 'Healthcare', general: 'Other services' }

export default function ServiceSelector({ selected, coverage, onService, onCoverage }) {
  const [params, setParams] = useSearchParams()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(!isOffline)
  const [loadError, setLoadError] = useState(false)
  const category = params.get('category')
  const [categoryDraft, setCategoryDraft] = useState(category || 'all')

  useEffect(() => setCategoryDraft(category || 'all'), [category])

  const searchByCategory = event => {
    event.preventDefault()
    const nextParams = new URLSearchParams(params)
    if (categoryDraft === 'all') nextParams.delete('category')
    else nextParams.set('category', categoryDraft)
    setParams(nextParams)
  }

  useEffect(() => {
    if (isOffline) return
    let active = true
    supabase.from('services')
      .select('id, name, description, slug, category, service_details, currency, coverage_levels, duration_minutes, provider_id, provider_profiles(display_name)')
      .eq('is_active', true).order('name')
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('Unable to load services', error); setLoadError(true) }
        setServices(data || [])
        setLoading(false)
      })
      .catch(error => {
        if (!active) return
        console.error('Unable to load services', error)
        setLoadError(true)
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const visibleServices = useMemo(() => category
    ? services.filter(service => service.category === category)
    : services, [category, services])

  return (
    <section style={{ padding: '40px 0 24px', color: '#233238' }}>
      <p style={{ color: '#247468', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 700 }}>Step 1 · Choose a service</p>
      <h2 style={{ fontSize: 32, margin: '8px 0' }}>What would you like to book?</h2>
      <p style={{ color: '#526267', marginBottom: 28 }}>Choose a provider service and its available option. Providers set the current price.</p>
      <form className="booking-category-search" onSubmit={searchByCategory}>
        <label htmlFor="booking-category">Search by category</label>
        <div className="booking-category-search-controls">
          <select id="booking-category" value={categoryDraft} onChange={event => setCategoryDraft(event.target.value)}>
            <option value="all">All categories</option>
            {Object.entries(categoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit" className="btn btn-primary"><Search size={16} /> Search</button>
        </div>
      </form>
      {isOffline && <p>Connect Supabase to browse services and make a booking.</p>}
      {!isOffline && loading && <p>Loading available services…</p>}
      {!isOffline && !loading && visibleServices.length === 0 && <p>No services are available in this category yet.</p>}
      {loadError && <p role="alert">We couldn’t load services right now. Please refresh the page and try again.</p>}
      <div className="booking-service-grid">
        {visibleServices.map(service => {
          const options = Array.isArray(service.coverage_levels) ? service.coverage_levels : []
          const active = selected === service.id
          const option = options.find(item => Number(item.level) === Number(coverage)) || options[0]
          return <article key={service.id} className={`booking-service-card ${active ? 'is-selected' : ''}`} role="radio" aria-checked={active} tabIndex={0} onClick={() => onService(service.id, service)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onService(service.id, service) } }}>
            <span className="booking-service-category">{categoryLabel[service.category] || service.category || 'Service'}</span>
            <h3 style={{ fontSize: 21, margin: '9px 0 5px' }}>{service.name}</h3>
            <p style={{ color: '#526267', lineHeight: 1.5, minHeight: 42 }}>{service.description || 'A service provided by a verified provider.'}</p>
            {Object.entries(service.service_details || {}).filter(([, value]) => value).length > 0 && <p style={{ color: '#40565b', fontSize: 13, lineHeight: 1.5 }}>{Object.entries(service.service_details).filter(([, value]) => value).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ')}</p>}
            <p style={{ fontSize: 13, color: '#526267' }}>Provider: {service.provider_profiles?.display_name || 'Service provider'} · {service.duration_minutes} min</p>
            {active && options.length > 1 && <label style={{ display: 'grid', gap: 6, margin: '14px 0' }} onClick={e => e.stopPropagation()}>
              <span>Booking option</span>
              <select value={coverage} onChange={e => onCoverage(Number(e.target.value))} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} style={{ padding: 10, borderRadius: 6, border: '1px solid #bdcbc5' }}>
                {options.map(item => <option key={item.level} value={item.level}>{item.label || `Option ${item.level}`} · {Number(item.price).toLocaleString()} {service.currency || 'ZAR'}</option>)}
              </select>
            </label>}
            <strong style={{ color: '#176b63', fontSize: 19 }}>{option ? `${Number(option.price).toLocaleString()} ${service.currency || 'ZAR'}` : 'Price unavailable'}</strong>
          </article>
        })}
      </div>
    </section>
  )
}
