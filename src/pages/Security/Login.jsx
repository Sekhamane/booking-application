import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function SecurityLogin() {
  const { session, profile, loading: authLoading, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [existingSessionRejected, setExistingSessionRejected] = useState(false)
  const handledSession = useRef(null)
  const loginAttempt = useRef(false)
  const sessionAuthorized = Boolean(session?.user && profile?.id === session.user.id && profile.role === 'security_admin')

  useEffect(() => {
    if (authLoading || loginAttempt.current) return
    if (!session?.user) {
      handledSession.current = null
      return
    }
    if (sessionAuthorized) {
      navigate('/', { replace: true })
      return
    }

    const userId = session.user.id
    if (handledSession.current === userId) return
    handledSession.current = userId
    let active = true
    setBusy(true)
    signOut().then(({ error }) => {
      if (error) console.error('Unable to sign out unauthorized security login session:', error)
    }).catch(error => {
      console.error('Unable to sign out unauthorized security login session:', error)
    }).finally(() => {
      if (active) {
        setAccessError('This account is not assigned the security_admin role. Sign in with an authorized security account.')
        setExistingSessionRejected(true)
        setBusy(false)
      }
    })
    return () => { active = false }
  }, [authLoading, session?.user?.id, sessionAuthorized, signOut, navigate])

  const submit = async event => {
    event.preventDefault()
    if (busy || isOffline) return
    setBusy(true)
    setAccessError('')
    setExistingSessionRejected(false)
    handledSession.current = null
    loginAttempt.current = true
    let authenticated = false
    let authenticatedUserId = null
    try {
      const { data, error } = await signIn(email.trim(), password)
      if (error) throw error
      if (!data.user?.id) throw new Error('Supabase did not return an authenticated user.')
      authenticated = true
      authenticatedUserId = data.user.id

      const { data: accountProfile, error: profileError } = await supabase.from('profiles')
        .select('id, role').eq('id', data.user.id).maybeSingle()
      if (profileError || accountProfile?.id !== data.user.id || accountProfile.role !== 'security_admin') {
        await signOut()
        authenticated = false
        handledSession.current = authenticatedUserId
        setExistingSessionRejected(true)
        setAccessError(profileError
          ? 'We could not verify this account’s security role. Access was denied.'
          : 'This account is not assigned the security_admin role. Access was denied.')
        return
      }

      navigate('/', { replace: true })
    } catch (error) {
      if (authenticated) await signOut()
      if (authenticatedUserId) {
        handledSession.current = authenticatedUserId
        setExistingSessionRejected(true)
      }
      setAccessError(error.message || 'Unable to sign in. Please try again.')
    } finally {
      loginAttempt.current = false
      setBusy(false)
    }
  }

  if (authLoading || (session?.user && !loginAttempt.current && !sessionAuthorized && !existingSessionRejected)) {
    return <main className="security-login-page"><div className="security-login-card" role="status">Verifying security access…</div></main>
  }

  return <main className="security-login-page">
    <form className="security-login-card" onSubmit={submit}>
      <p className="security-login-eyebrow">Restricted workspace</p>
      <h1>Security Admin</h1>
      <p>Sign in with an account assigned the security administrator role.</p>
      {(accessError || (location.state?.accessDenied && 'This session is not authorized for the Security workspace. Sign in with a security_admin account.')) &&
        <p role="alert">{accessError || 'This session is not authorized for the Security workspace. Sign in with a security_admin account.'}</p>}
      {isOffline && <p role="alert">Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.</p>}
      <label>Email<input autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Password<input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <button className="btn btn-primary" type="submit" disabled={busy || isOffline}>{busy ? 'Verifying…' : 'Sign in securely'}</button>
    </form>
  </main>
}
