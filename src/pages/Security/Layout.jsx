import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isSecurityHost, securityPath } from '../../lib/securityHost'

export default function SecurityLayout() {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="security-workspace" style={{ padding: 140, textAlign: 'center' }}>Loading security workspace…</div>
  if (!session) return <Navigate to={isSecurityHost ? '/login' : '/account'} replace />
  if (profile?.role !== 'security_admin') return <Navigate to={isSecurityHost ? '/login' : '/account'} replace />
  return <div className="security-workspace">
    <nav aria-label="Security workspace" className="security-nav">
      <Link to={securityPath()}>Audit activity</Link>
      <Link to={securityPath('roles')}>Roles and permissions</Link>
      <Link to={securityPath('privacy')}>Privacy requests</Link>
    </nav>
    <div style={{ paddingTop: 44 }}><Outlet /></div>
  </div>
}
