import { useEffect, useState } from 'react'
import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isSecurityHost, securityPath } from '../../lib/securityHost'

export default function SecurityLayout() {
  const { session, profile, loading, signOut } = useAuth()
  const [signOutFinishedFor, setSignOutFinishedFor] = useState(null)
  const authorized = Boolean(session?.user && profile?.id === session.user.id && profile.role === 'security_admin')

  useEffect(() => {
    if (loading) return
    if (!session?.user || authorized) {
      setSignOutFinishedFor(null)
      return
    }

    const sessionKey = session.access_token || session.user.id
    if (signOutFinishedFor === sessionKey) return
    signOut().then(({ error }) => {
      if (error) console.error('Unable to sign out unauthorized security session:', error)
    }).catch(error => {
      console.error('Unable to sign out unauthorized security session:', error)
    }).finally(() => {
      setSignOutFinishedFor(sessionKey)
    })
  }, [loading, session?.user?.id, session?.access_token, authorized, signOut, signOutFinishedFor])

  const sessionKey = session?.access_token || session?.user?.id
  if (loading || (session && !authorized && signOutFinishedFor !== sessionKey)) {
    return <div className="security-workspace" style={{ padding: 140, textAlign: 'center' }}>Verifying security access…</div>
  }
  if (!session || !authorized) {
    return <Navigate
      to={isSecurityHost ? '/login' : '/account'}
      replace
      state={isSecurityHost && session ? { accessDenied: true } : undefined}
    />
  }

  return <div className="security-workspace">
    <nav aria-label="Security workspace" className="security-nav">
      <Link to={securityPath()}>Audit activity</Link>
      <Link to={securityPath('roles')}>Roles and permissions</Link>
      <Link to={securityPath('privacy')}>Privacy requests</Link>
      <Link to={securityPath('messages')}>Messages to Security</Link>
    </nav>
    <div style={{ paddingTop: 44 }}><Outlet /></div>
  </div>
}
