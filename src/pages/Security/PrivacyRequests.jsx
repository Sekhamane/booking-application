import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'

export default function PrivacyRequests() {
  const [requests, setRequests] = useState([])
  const [notes, setNotes] = useState({})
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('privacy_requests')
      .select('id, request_type, status, requested_at, completed_at, admin_notes, profiles(full_name, email)')
      .order('requested_at', { ascending: true })
    if (error) toast.error('Unable to load privacy requests.')
    setRequests(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const update = async (request, status) => {
    const adminNotes = notes[request.id] ?? request.admin_notes ?? ''
    if (request.request_type === 'deletion' && status === 'completed' && !adminNotes.trim()) {
      toast.error('Add a note describing the completed deletion or retention action.')
      return
    }
    if (request.request_type === 'deletion' && status === 'completed') {
      const { data, error } = await supabase.functions.invoke('process-privacy-deletion', { body: { request_id: request.id, admin_notes: adminNotes } })
      if (error || data?.error) toast.error(data?.error || error.message || 'Deletion processing failed.')
      else { toast.success('Account deletion processed.'); load() }
      return
    }
    const { error } = await supabase.rpc('security_update_privacy_request', {
      p_request_id: request.id, p_status: status, p_admin_notes: adminNotes,
    })
    if (error) toast.error(error.message)
    else { toast.success('Privacy request updated.'); load() }
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to manage privacy requests.</main>
  return <main style={{ maxWidth: 1050, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Privacy requests</h1>
    <p style={{ padding: 14, borderRadius: 8, background: '#fff3dc' }}>Completing a deletion request removes the account credentials and anonymizes linked customer records. Review applicable retention requirements and add an action note first.</p>
    <div style={{ display: 'grid', gap: 12 }}>{requests.map(request => <article key={request.id} style={{ padding: 18, background: '#fff', border: '1px solid #dce5e0', borderRadius: 9 }}>
      <strong>{request.request_type === 'export' ? 'Data export' : 'Deletion request'} · {request.status}</strong>
      <p>{request.profiles?.full_name} · {request.profiles?.email} · Requested {new Date(request.requested_at).toLocaleString()}</p>
      <textarea placeholder="Action and retention notes" maxLength={2000} value={notes[request.id] ?? request.admin_notes ?? ''} onChange={e => setNotes({ ...notes, [request.id]: e.target.value })} style={{ width: '100%', minHeight: 70, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{['processing','completed','rejected'].map(status => <button className="btn btn-secondary" key={status} onClick={() => update(request, status)}>{status}</button>)}</div>
    </article>)}{requests.length === 0 && <p>No privacy requests are pending.</p>}</div>
  </main>
}
