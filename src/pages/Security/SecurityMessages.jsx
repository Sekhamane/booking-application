import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export function SecurityMessageForm() {
  const { session } = useAuth()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const cleanMessage = message.trim()
    if (!session?.user || !cleanMessage || isOffline || sending) return
    setSending(true)
    const { error } = await supabase.from('security_messages').insert({
      profile_id: session.user.id,
      message: cleanMessage,
    })
    setSending(false)
    if (error) {
      console.error('Unable to submit Security message:', error)
      if (['42P01', 'PGRST205'].includes(error.code)) {
        toast.error('Security messaging is not set up yet. Please contact the site administrator to apply migration 010.')
      } else {
        toast.error('Your message could not be sent. Please try again later.')
      }
    }
    else {
      setMessage('')
      toast.success('Your message was sent to Security.')
    }
  }

  if (!session?.user) return <p className="privacy-security-login">Please <Link to="/account">sign in</Link> to send a message to Security.</p>

  return <form className="privacy-security-form" onSubmit={submit}>
    <label htmlFor="privacy-security-message">Message to Security</label>
    <textarea id="privacy-security-message" value={message} onChange={event => setMessage(event.target.value)} required maxLength={5000} rows={4} placeholder="Write your message here" />
    <button type="submit" disabled={!message.trim() || sending || isOffline}>{sending ? 'Sending…' : 'Send to Security'}</button>
  </form>
}

export default function SecurityMessages() {
  const [messages, setMessages] = useState([])
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('security_messages')
      .select('id, message, status, created_at, admin_notes, profiles(full_name, email)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Unable to load Security messages.')
    setMessages(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (!isOffline) load(); else setLoading(false) }, [load])

  const updateStatus = async (message, status) => {
    const { error } = await supabase.rpc('security_update_message', {
      p_message_id: message.id,
      p_status: status,
      p_admin_notes: notes[message.id] ?? message.admin_notes ?? '',
    })
    if (error) toast.error(error.message)
    else { toast.success('Security message updated.'); load() }
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to manage Security messages.</main>
  return <main style={{ maxWidth: 1050, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Messages to Security</h1>
    <p>Messages submitted through the privacy notice appear here for security administrators.</p>
    <div style={{ display: 'grid', gap: 12 }}>{messages.map(item => <article key={item.id} style={{ padding: 18, background: '#fff', border: '1px solid #dce5e0', borderRadius: 9 }}>
      <strong>{item.profiles?.full_name || 'Account'} · {item.status}</strong>
      <p style={{ color: '#526267' }}>{item.profiles?.email || 'Email unavailable'} · {new Date(item.created_at).toLocaleString()}</p>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.message}</p>
      <label style={{ display: 'grid', gap: 6 }}>Internal notes<textarea maxLength={2000} value={notes[item.id] ?? item.admin_notes ?? ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} style={{ width: '100%', minHeight: 65, boxSizing: 'border-box' }} /></label>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{['open', 'resolved'].map(status => <button className="btn btn-secondary" key={status} onClick={() => updateStatus(item, status)}>{status}</button>)}</div>
    </article>)}{!loading && messages.length === 0 && <p>No Security messages have been submitted.</p>}{loading && <p>Loading messages…</p>}</div>
  </main>
}
