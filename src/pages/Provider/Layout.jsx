import { Navigate, Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProviderLayout() {
  const { session, profile, loading } = useAuth()
  if (loading) return <div style={{ padding: 140, textAlign: 'center', color: '#f7f8f5' }}>Loading provider workspace...</div>
  if (!session) return <Navigate to="/account" replace />
  if (profile?.role !== 'provider') return <Navigate to="/account" replace />
  const links = [
    { to: '/provider', label: 'Overview', end: true },
    { to: '/provider/services', label: 'Services' },
    { to: '/provider/availability', label: 'Availability' },
    { to: '/provider/bookings', label: 'Bookings' },
    { to: '/provider/waitlist', label: 'Waitlist' },
  ]
  return <div className="provider-workspace">
    <nav aria-label="Provider workspace" className="provider-nav">
      {links.map(({ to, label, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `provider-nav-link${isActive ? ' active' : ''}`}>{label}</NavLink>)}
    </nav>
    <div className="provider-content"><Outlet /></div>
  </div>
}
