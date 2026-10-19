import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, CalendarDays, Users, Clock, BarChart3, Settings, LogOut, BrainCircuit,
  BriefcaseBusiness,
} from 'lucide-react'

const LINKS = [
  { to: '/admin',                  label: 'Dashboard',     icon: LayoutDashboard, exact: true },
  { to: '/admin/bookings',         label: 'Bookings',      icon: CalendarDays },
  { to: '/admin/customers',        label: 'Customers',     icon: Users },
  { to: '/admin/users',            label: 'Users',         icon: Users },
  { to: '/admin/providers',        label: 'Providers',     icon: BriefcaseBusiness },
  { to: '/admin/waitlist',         label: 'Waitlist',      icon: Clock },
  { to: '/admin/analytics',        label: 'Analytics',     icon: BarChart3 },
  { to: '/admin/ai',              label: 'Demand AI',     icon: BrainCircuit },
  { to: '/admin/settings',         label: 'Settings',      icon: Settings },
]

export default function AdminSidebar() {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
    borderRadius: 8, textDecoration: 'none', fontFamily: '"DM Sans"', fontSize: 13,
    background: isActive ? 'rgba(111,155,142,0.2)' : 'transparent',
    color: isActive ? '#8bc3b0' : 'rgba(247,248,245,0.78)',
    transition: 'all 0.2s ease',
    marginBottom: 2,
  })

  return (
    <aside style={{ width: 220, background: '#203238', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0, overflowY: 'auto' }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 24px', borderBottom: '1px solid rgba(247,248,245,0.14)', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#f7f8f5', fontWeight: 600 }}>Teabag Booking System</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#bdceca', marginTop: 2, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Admin workspace</div>
      </div>

      {/* Links */}
      <nav style={{ flex: 1 }}>
        {LINKS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink key={to} to={to} end={exact}>
            {({ isActive }) => (
              <div style={linkStyle(isActive)}>
                <Icon size={16} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <button onClick={handleSignOut}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans"', fontSize: 13, background: 'transparent', color: '#d6e1de', width: '100%' }}>
        <LogOut size={16} /> Sign Out
      </button>
    </aside>
  )
}
