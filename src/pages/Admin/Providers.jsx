import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('provider_profiles')
      .select('id, display_name, description, is_active, profiles(full_name, email, phone)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Unable to load provider accounts.')
    setProviders(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const setActive = async provider => {
    const { error } = await supabase.rpc('admin_set_provider_active', { p_provider_id: provider.id, p_active: !provider.is_active })
    if (error) toast.error(error.message)
    else { toast.success(provider.is_active ? 'Provider paused.' : 'Provider approved.'); load() }
  }

  if (isOffline) return <div><h1>Provider management</h1><p>Connect Supabase to manage providers.</p></div>
  return <div style={{ color: '#233238' }}>
    <h1 style={{ fontSize: 32 }}>Provider management</h1>
    <p style={{ color: '#526267' }}>Provider accounts remain inactive until approved.</p>
    {loading ? <p>Loading…</p> : <div style={{ display: 'grid', gap: 12 }}>{providers.map(provider => <article key={provider.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: 18, background: '#fff', border: '1px solid #dce5e0', borderRadius: 9 }}>
      <div><strong>{provider.display_name}</strong><p style={{ margin: '5px 0', color: '#526267' }}>{provider.profiles?.full_name} · {provider.profiles?.email} · {provider.profiles?.phone}</p><p style={{ margin: 0 }}>{provider.description || 'No description provided'} · {provider.is_active ? 'Active' : 'Pending approval'}</p></div>
      <button className="btn btn-secondary" onClick={() => setActive(provider)}>{provider.is_active ? 'Pause' : 'Approve'}</button>
    </article>)}{!providers.length && <p>No provider accounts yet. Assign the provider role from User management.</p>}</div>}
  </div>
}
