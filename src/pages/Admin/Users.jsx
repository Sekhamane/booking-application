import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, phone, role, created_at').order('created_at', { ascending: false })
    if (error) toast.error('Unable to load users.')
    setUsers(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const changeRole = async (user, role) => {
    const { error } = await supabase.rpc('admin_set_user_role', { p_profile_id: user.id, p_role: role })
    if (error) toast.error(error.message)
    else { toast.success('User role updated.'); load() }
  }

  if (isOffline) return <div><h1>User management</h1><p>Connect Supabase to manage accounts.</p></div>
  return <div style={{ color: '#233238' }}>
    <h1 style={{ fontSize: 32 }}>User management</h1>
    <p style={{ color: '#526267' }}>New accounts default to customer. Provider and admin access changes are recorded in the audit log.</p>
    {loading ? <p>Loading…</p> : <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Name', 'Email', 'Phone', 'Role', 'Joined'].map(item => <th key={item} style={{ padding: 12, textAlign: 'left' }}>{item}</th>)}</tr></thead>
        <tbody>{users.map(user => <tr key={user.id} style={{ borderTop: '1px solid #e6ece9' }}><td style={{ padding: 12 }}>{user.full_name || '—'}</td><td style={{ padding: 12 }}>{user.email}</td><td style={{ padding: 12 }}>{user.phone || '—'}</td><td style={{ padding: 12 }}><select value={user.role} onChange={e => changeRole(user, e.target.value)}><option value="customer">Customer</option><option value="provider">Provider</option><option value="admin">Admin</option><option value="security_admin" disabled>Security admin (security workspace only)</option></select></td><td style={{ padding: 12 }}>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody>
      </table>
    </div>}
  </div>
}
