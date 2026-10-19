import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { isOffline, supabase } from '../lib/supabase'
import { securityPath } from '../lib/securityHost'

const inputStyle = {
  display: 'block', width: '100%', marginTop: 7, padding: '13px 14px', borderRadius: 8,
  border: '1px solid #b8c9c2', background: '#fff', color: '#203238',
  boxSizing: 'border-box', font: 'inherit', fontSize: 16, outlineColor: '#176b63',
}

const cardStyle = {
  width: 'min(100% - 32px, 480px)', margin: '112px auto 72px', padding: 'clamp(24px, 5vw, 40px)',
  color: '#203238', background: '#f7f8f5', border: '1px solid #d5e1dc', borderRadius: 16,
  boxShadow: '0 20px 60px rgba(0,0,0,.24)',
}

export default function Account() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { signIn, signUp, session, profile, loading } = useAuth()
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const destination = (role) => {
    if (role === 'admin') return '/admin'
    if (role === 'provider') return '/provider'
    if (role === 'security_admin') return securityPath()
    return '/account/bookings'
  }

  const submit = async (event) => {
    event.preventDefault()
    if (isOffline) {
      toast.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart Vite.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        const { data, error } = await signUp(email.trim(), password, fullName.trim(), phone.trim(), privacyAccepted, marketingConsent)
        if (error) throw error
        if (!data?.session) {
          toast.success('Check your email to confirm your account, then sign in.')
          setMode('login')
        } else {
          toast.success('Account created.')
          navigate('/account/bookings')
        }
      } else {
        const { data, error } = await signIn(email.trim(), password)
        if (error) throw error
        // Resolve the database role after auth so staff land in their own workspace.
        const { data: accountProfile, error: profileError } = await supabase
          .from('profiles').select('role').eq('id', data.user.id).single()
        if (profileError) throw profileError
        navigate(destination(accountProfile.role), { replace: true })
      }
    } catch (error) {
      toast.error(error.message || 'Unable to complete the request.')
    } finally {
      setBusy(false)
    }
  }

  if (session && !loading && profile) {
    return <main style={{ ...cardStyle, width: 'min(100% - 32px, 560px)' }}>
      <h1>Welcome, {profile.full_name || 'there'}</h1>
      <p>You are signed in as {profile.role.replace('_', ' ')}.</p>
      <Link to={destination(profile.role)}>Continue to your account</Link>
    </main>
  }

  return (
    <main style={cardStyle}>
      <h1 style={{ color: '#203238', fontSize: 34, lineHeight: 1.15, marginBottom: 8 }}>{mode === 'register' ? 'Create your account' : 'Sign in'}</h1>
      <p style={{ color: '#526267', marginBottom: 28 }}>Manage your bookings across trusted service providers.</p>
      {isOffline && <aside role="alert" style={{ padding: 16, marginBottom: 20, border: '1px solid #d7b76b', borderRadius: 8, background: '#fff8e8', color: '#403515', lineHeight: 1.55 }}>
        <strong>Supabase Auth needs configuration.</strong>
        <p style={{ margin: '8px 0' }}>This project has no <code>.env</code> file yet, so sign-in and account creation are disabled.</p>
        <ol style={{ paddingLeft: 22, margin: '8px 0' }}>
          <li>In the project folder, run <code>Copy-Item .env.example .env</code>.</li>
          <li>Open <code>.env</code> and replace the example values for <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> with the values from your Supabase project’s API settings.</li>
          <li>Save the file and restart Vite with <code>npm.cmd run dev</code>.</li>
        </ol>
        <p style={{ margin: '8px 0 0' }}>Use the public anon/publishable key only. Never put a Supabase service-role key in this file.</p>
      </aside>}
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        {mode === 'register' && <>
          <label style={{ display: 'block', color: '#203238', fontWeight: 600 }}>Full name<input style={inputStyle} autoComplete="name" name="name" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required /></label>
          <label style={{ display: 'block', color: '#203238', fontWeight: 600 }}>Phone<input style={inputStyle} autoComplete="tel" name="phone" type="tel" placeholder="Your phone number" value={phone} onChange={e => setPhone(e.target.value)} required /></label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: '#526267', fontSize: 13 }}>
            <input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} required />
            I have read the <Link to="/privacy" onClick={event => event.stopPropagation()} style={{ color: '#176b63' }}>privacy notice</Link> and understand how booking information is used to provide this service.
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: '#526267', fontSize: 13 }}>
            <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} />
            Send me optional product and service updates.
          </label>
        </>}
        <label style={{ display: 'block', color: '#203238', fontWeight: 600 }}>Email<input style={inputStyle} autoComplete="email" name="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label style={{ display: 'block', color: '#203238', fontWeight: 600 }}>Password
          <span style={{ position: 'relative', display: 'block' }}>
            <input style={{ ...inputStyle, paddingRight: 82 }} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} name="password" type={showPassword ? 'text' : 'password'} minLength={8} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: '#14544e', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 4px' }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
          {mode === 'register' && <span style={{ display: 'block', marginTop: 6, color: '#526267', fontSize: 13, fontWeight: 400 }}>Use at least 8 characters.</span>}
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || isOffline}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
      </form>
      <p style={{ marginTop: 22, color: '#526267' }}>
        {mode === 'register' ? 'Already registered?' : 'New to Teabag?'}{' '}
        <button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')} style={{ border: 0, background: 'none', color: '#176b63', cursor: 'pointer', font: 'inherit' }}>
          {mode === 'register' ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </main>
  )
}
