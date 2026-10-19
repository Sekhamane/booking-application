import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'

export default function Roles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role').order('email')
    if (error) toast.error('Unable to load roles.')
    setProfiles(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const assign = async (profile, role) => {
    const { error } = await supabase.rpc('admin_set_user_role', { p_profile_id: profile.id, p_role: role })
    if (error) toast.error(error.message)
    else { toast.success('Role and audit record updated.'); load() }
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to administer roles.</main>
  return <main style={{ maxWidth: 1000, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Roles and permissions</h1>
    <p style={{ color: '#526267' }}>Only security administrators can grant or revoke the security-admin role. Role changes are recorded in the audit log.</p>
    {loading ? <p>Loading…</p> : <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Account', 'Current role', 'Assign role'].map(x => <th key={x} style={{ textAlign: 'left', padding: 12 }}>{x}</th>)}</tr></thead>
      <tbody>{profiles.map(profile => <tr key={profile.id} style={{ borderTop: '1px solid #e6ece9' }}><td style={{ padding: 12 }}>{profile.full_name || '—'}<br /><small>{profile.email}</small></td><td style={{ padding: 12 }}>{profile.role.replace('_', ' ')}</td><td style={{ padding: 12 }}><select value={profile.role} onChange={e => assign(profile, e.target.value)}>{['customer','provider','admin','security_admin'].map(role => <option key={role} value={role}>{role.replace('_',' ')}</option>)}</select></td></tr>)}</tbody>
    </table></div>}
  </main>
}
