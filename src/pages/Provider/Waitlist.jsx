import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function ProviderWaitlist() {
  const { session } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!session?.user || isOffline) { setLoading(false); return }
    const { data, error } = await supabase.from('waitlist')
      .select('id, profile_id, requested_date, notified, claimed, services(name), time_slots(label), profiles(full_name, phone, email)')
      .order('created_at', { ascending: true })
    if (error) toast.error('Unable to load waitlist.')
    setEntries(data || [])
    setLoading(false)
  }, [session?.user])
  useEffect(() => { load() }, [load])

  const markNotified = async entry => {
    const { error } = await supabase.from('waitlist').update({ notified: true, notified_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString() }).eq('id', entry.id)
    if (error) toast.error(error.message)
    else { toast.success('Waitlist entry updated. Contact the customer using your approved channel.'); load() }
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to manage the waitlist.</main>
  return <main style={{ maxWidth: 1050, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Waitlist</h1>
    {loading ? <p>Loading…</p> : <div style={{ display: 'grid', gap: 10 }}>{entries.map(entry => <article key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', padding: 18, border: '1px solid #dce5e0', background: '#fff', borderRadius: 9 }}>
      <div><strong>{entry.services?.name} · {entry.requested_date} · {entry.time_slots?.label}</strong><p style={{ margin: '7px 0' }}>{entry.profiles?.full_name} · {entry.profiles?.phone} · {entry.profiles?.email}</p><p style={{ color: '#526267', margin: 0 }}>Notified: {entry.notified ? 'Yes' : 'No'} · Claimed: {entry.claimed ? 'Yes' : 'No'}</p></div>
      {!entry.notified && <button className="btn btn-secondary" onClick={() => markNotified(entry)}>Mark contacted</button>}
    </article>)}{entries.length === 0 && <p>No customers are waiting for an available time.</p>}</div>}
  </main>
}
