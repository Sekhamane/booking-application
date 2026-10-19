import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase, isOffline } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, session, profile, loading: authLoading } = useAuth()
  const navigate              = useNavigate()

  useEffect(() => {
    if (!authLoading && session && profile?.role === 'admin') navigate('/admin', { replace: true })
  }, [authLoading, session, profile, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await signIn(email.trim(), password)
      if (error) throw error
      const { data: accountProfile, error: profileError } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).single()
      if (profileError) throw profileError
      if (accountProfile.role !== 'admin') {
        toast.error('This account is not assigned the admin role. Ask your project administrator to grant access.')
        navigate('/account', { replace: true })
        return
      }
      toast.success('Signed in to the admin dashboard.')
      navigate('/admin', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '13px 14px', borderRadius: 7, border: '1px solid #b8c9c2', fontFamily: 'var(--font-sans)', fontSize: 16, background: '#fff', color: '#203238', boxSizing: 'border-box', outlineColor: '#176b63' }

  return (
    <div style={{ minHeight: '100vh', background: '#203238', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#f7f8f5', border: '1px solid #d5e1dc', borderRadius: 16, padding: 'clamp(26px, 6vw, 44px)', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.24)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#203238' }}>Teabag Admin</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#526267', marginTop: 6 }}>Teabag Booking Platform</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isOffline && <p role="alert" style={{ color: '#762d27', background: '#fff0ed', padding: 12, borderRadius: 7 }}>Configure the Supabase URL and public key in .env before signing in.</p>}
          <label style={{ color: '#203238', fontWeight: 600 }}>Email<input style={inputStyle} autoComplete="username" name="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label style={{ color: '#203238', fontWeight: 600 }}>Password<input style={inputStyle} autoComplete="current-password" name="password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, marginTop: 8 }} disabled={loading || isOffline}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
