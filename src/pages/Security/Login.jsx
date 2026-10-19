import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function SecurityLogin() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    try {
      if (isOffline) throw new Error('Configure Supabase before signing in.')
      const { data, error } = await signIn(email.trim(), password)
      if (error) throw error
      const { data: profile, error: profileError } = await supabase.from('profiles')
        .select('role').eq('id', data.user.id).single()
      if (profileError) throw profileError
      if (profile.role !== 'security_admin') {
        await supabase.auth.signOut()
        throw new Error('This account is not assigned the security_admin role.')
      }
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="security-login-page">
    <form className="security-login-card" onSubmit={submit}>
      <p className="security-login-eyebrow">Restricted workspace</p>
      <h1>Security Admin</h1>
      <p>Sign in with an account assigned the security administrator role.</p>
      {isOffline && <p role="alert">Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.</p>}
      <label>Email<input autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Password<input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <button className="btn btn-primary" type="submit" disabled={busy || isOffline}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
    </form>
  </main>
}
