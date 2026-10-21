import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isOffline } from '../../lib/supabase'
import { useSecurityAuth } from './SecurityAuthGate'

const ACCESS_DENIED = 'Access denied. This account is not assigned the security_admin role.'

export default function SecurityLogin() {
  const { denial } = useSecurityAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [accessError, setAccessError] = useState('')

  const submit = async event => {
    event.preventDefault()
    if (busy || isOffline) return
    setBusy(true)
    setAccessError('')
    let authenticated = false
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('Supabase did not return an authenticated user.')
      authenticated = true

      const { data: profile, error: profileError } = await supabase.from('profiles')
        .select('id, role').eq('id', userId).maybeSingle()
      if (profileError || profile?.id !== userId || profile.role !== 'security_admin') {
        await supabase.auth.signOut()
        authenticated = false
        setAccessError(ACCESS_DENIED)
        return
      }

      navigate('/', { replace: true })
    } catch (error) {
      if (authenticated) await supabase.auth.signOut()
      setAccessError(error.message || 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="security-login-page">
    <form className="security-login-card" onSubmit={submit}>
      <p className="security-login-eyebrow">Restricted workspace</p>
      <h1>Security Admin Login</h1>
      <p>Sign in with an account assigned the security administrator role.</p>
      {(accessError || denial) && <p role="alert">{accessError || denial}</p>}
      {isOffline && <p role="alert">Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.</p>}
      <label>Email<input autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Password<input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <button className="btn btn-primary" type="submit" disabled={busy || isOffline}>{busy ? 'Verifying...' : 'Sign in securely'}</button>
    </form>
  </main>
}
