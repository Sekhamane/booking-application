import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { securityPath } from '../../lib/securityHost'

const card = { background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 18 }
const roleNames = ['customer', 'provider', 'admin', 'security_admin']
const localDate = value => value ? new Date(value).toLocaleString() : '—'

export default function SecurityHome() {
  const { session, profile, loading, signOut } = useAuth()
  const [events, setEvents] = useState([])
  const [counts, setCounts] = useState({ customer: 0, provider: 0, admin: 0, security_admin: 0, pendingPrivacy: 0, openDeletions: 0 })
  const [fetching, setFetching] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => {
    if (!session?.user || isOffline || profile?.role !== 'security_admin') return
    setFetching(true)
    const [auditResult, profileResult, privacyResult] = await Promise.all([
      supabase.from('audit_logs').select('id, actor_id, action, resource_type, resource_id, outcome, metadata, created_at')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('role'),
      supabase.from('privacy_requests').select('request_type, status'),
    ])
    if (auditResult.error) toast.error(`Could not load audit activity: ${auditResult.error.message}`)
    else setEvents(auditResult.data || [])
    if (profileResult.error) toast.error(`Could not load account summary: ${profileResult.error.message}`)
    else {
      const next = { customer: 0, provider: 0, admin: 0, security_admin: 0 }
      for (const row of profileResult.data || []) if (roleNames.includes(row.role)) next[row.role] += 1
      setCounts(current => ({ ...current, ...next }))
    }
    if (privacyResult.error) toast.error(`Could not load privacy request summary: ${privacyResult.error.message}`)
    else {
      const requests = privacyResult.data || []
      setCounts(current => ({ ...current,
        pendingPrivacy: requests.filter(row => row.status === 'pending').length,
        openDeletions: requests.filter(row => row.request_type === 'deletion' && ['pending', 'processing'].includes(row.status)).length,
      }))
    }
    setFetching(false)
  }, [session?.user, profile?.role])

  useEffect(() => { refresh() }, [refresh])

  const filteredEvents = useMemo(() => events.filter(event => {
    const matchesOutcome = filter === 'all' || event.outcome === filter
    const needle = search.trim().toLowerCase()
    const matchesSearch = !needle || [event.action, event.resource_type, event.resource_id, event.actor_id, JSON.stringify(event.metadata || {})]
      .some(value => String(value || '').toLowerCase().includes(needle))
    return matchesOutcome && matchesSearch
  }), [events, filter, search])

  if (loading) return <main style={{ margin: '120px auto', textAlign: 'center' }}>Loading security workspace…</main>
  if (!session) return <Navigate to="/account" replace />
  if (profile?.role !== 'security_admin') return <Navigate to="/account" replace />

  const metrics = [
    ['Customer accounts', counts.customer], ['Providers', counts.provider], ['Administrators', counts.admin],
    ['Security administrators', counts.security_admin], ['Pending privacy requests', counts.pendingPrivacy], ['Open deletion requests', counts.openDeletions],
  ]

  return <main style={{ maxWidth: 1180, margin: '120px auto 80px', padding: 24, color: '#233238' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, flexWrap: 'wrap' }}>
      <div><p style={{ color: '#526267', marginBottom: 4 }}>Restricted workspace · Security administrator</p><h1 style={{ fontSize: 36, margin: '0 0 8px' }}>Security overview</h1>
        <p style={{ color: '#526267', marginTop: 0 }}>Review access, privacy work, and recorded security activity.</p></div>
      <button className="btn btn-secondary" onClick={refresh} disabled={fetching}>{fetching ? 'Refreshing…' : 'Refresh overview'}</button>
    </div>

    {isOffline ? <p>Connect Supabase to view security activity and account summaries.</p> : <>
      <section aria-label="Account and privacy summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, margin: '22px 0' }}>
        {metrics.map(([label, value]) => <article key={label} style={card}><span style={{ color: '#526267', fontSize: 13 }}>{label}</span><strong style={{ display: 'block', fontSize: 28, marginTop: 7 }}>{value}</strong></article>)}
      </section>

      <section aria-label="Security administration" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 28 }}>
        <article style={card}><h2 style={{ marginTop: 0 }}>Roles and permissions</h2><p>Review accounts and assign customer, provider, admin, or security-admin access.</p><Link className="btn btn-primary" to={securityPath('roles')}>Manage roles</Link></article>
        <article style={card}><h2 style={{ marginTop: 0 }}>Privacy requests</h2><p>Review account export and deletion requests, record decisions, and track completion.</p><Link className="btn btn-primary" to={securityPath('privacy')}>Review requests</Link></article>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
          <div><h2 style={{ margin: '0 0 5px' }}>Audit activity</h2><p style={{ color: '#526267', margin: 0 }}>Latest 200 recorded actions.</p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label>Outcome <select value={filter} onChange={event => setFilter(event.target.value)} style={{ padding: 9, marginLeft: 6 }}><option value="all">All</option><option value="success">Success</option><option value="denied">Denied</option><option value="failure">Failure</option></select></label>
            <label>Search <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Action, actor, resource…" style={{ padding: 9, marginLeft: 6, minWidth: 210 }} /></label>
          </div>
        </div>
        <div style={{ overflowX: 'auto', marginTop: 18 }}><table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead><tr>{['Time', 'Actor', 'Action', 'Resource', 'Outcome', 'Details'].map(label => <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #dce3e3' }}>{label}</th>)}</tr></thead>
          <tbody>{filteredEvents.map(event => <tr key={event.id}>
            <td style={{ padding: 12, borderBottom: '1px solid #edf1ef', whiteSpace: 'nowrap' }}>{localDate(event.created_at)}</td>
            <td style={{ padding: 12, borderBottom: '1px solid #edf1ef' }}>{event.actor_id || 'System'}</td>
            <td style={{ padding: 12, borderBottom: '1px solid #edf1ef' }}>{event.action}</td>
            <td style={{ padding: 12, borderBottom: '1px solid #edf1ef' }}>{event.resource_type}{event.resource_id ? ` · ${event.resource_id}` : ''}</td>
            <td style={{ padding: 12, borderBottom: '1px solid #edf1ef' }}>{event.outcome}</td>
            <td style={{ padding: 12, borderBottom: '1px solid #edf1ef', maxWidth: 280, overflowWrap: 'anywhere' }}>{Object.keys(event.metadata || {}).length ? JSON.stringify(event.metadata) : '—'}</td>
          </tr>)}</tbody>
        </table></div>
        {!filteredEvents.length && <p style={{ color: '#526267' }}>{events.length ? 'No audit events match those filters.' : 'No recorded events yet.'}</p>}
      </section>
    </>}
    <button style={{ marginTop: 20 }} className="btn btn-secondary" onClick={signOut}>Sign out</button>
  </main>
}
