import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, BriefcaseBusiness } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error(error.message || 'Unable to sign out.')
      return
    }
    setOpen(false)
    toast.success('You have signed out.')
    navigate('/account', { replace: true })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { to: '/',         label: 'Home' },
    { to: '/book',     label: 'Services' },
    { to: '/account',  label: 'My account' },
  ]

  return (
    <header style={{
      position: 'fixed',
      inset: '0 0 auto 0',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2rem',
      padding: (scrolled || pathname !== '/')
        ? '0.85rem clamp(1.25rem, 4vw, 3rem)'
        : '1.4rem clamp(1.25rem, 4vw, 3rem)',
      transition: 'background 0.5s var(--ease), padding 0.5s var(--ease), backdrop-filter 0.5s var(--ease), border-color 0.5s var(--ease)',
      background: (scrolled || pathname !== '/')
        ? 'color-mix(in oklab, var(--bg) 95%, transparent)'
        : 'color-mix(in oklab, var(--bg) 32%, transparent)',
      backdropFilter: (scrolled || pathname !== '/') ? 'blur(16px) saturate(1.1)' : 'blur(6px)',
      borderBottom: (scrolled || pathname !== '/') ? '1px solid var(--line)' : '1px solid transparent',
    }}>
      {/* Brand mark */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}>
        <BriefcaseBusiness size={30} color="var(--accent, #247468)" />
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <b style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: '1.18rem',
            letterSpacing: '0.01em',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
          }}>
            Teabag Booking Platform
          </b>
          <span style={{
            fontSize: '0.58rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--text-soft)',
            whiteSpace: 'nowrap',
          }}>
            Flights · stays · appointments
          </span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex" style={{ alignItems: 'center', gap: '2.4rem' }}>
        <div style={{ display: 'flex', gap: '2.1rem' }}>
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.78rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: pathname === l.to ? 'var(--text)' : 'var(--text-soft)',
                position: 'relative',
                paddingBottom: '2px',
                transition: 'color 0.35s var(--ease)',
                textDecoration: 'none',
              }}
              className="nav-link"
            >
              {l.label}
            </Link>
          ))}
        </div>
        {session && <button type="button" onClick={handleSignOut} style={{ border: '1px solid var(--line-strong)', borderRadius: 4, padding: '0.65rem 0.9rem', background: 'transparent', color: 'var(--text)', cursor: 'pointer', font: 'inherit', fontSize: '0.76rem' }}>Sign out</button>}
        <Link to="/book" className="btn btn-primary" style={{ padding: '0.7rem 1.4rem' }}>
          Find services
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </Link>
      </nav>

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex md:hidden"
        style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', padding: 4 }}
        aria-label="Toggle menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'color-mix(in oklab, var(--bg) 95%, transparent)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          padding: '1.5rem clamp(1.25rem, 4vw, 3rem) 2rem',
        }}>
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: pathname === l.to ? 'var(--text)' : 'var(--text-soft)',
                padding: '0.9rem 0',
                textDecoration: 'none',
                borderBottom: '1px solid var(--line)',
                transition: 'color 0.3s ease',
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {session && <button type="button" onClick={handleSignOut} style={{ border: '1px solid var(--line-strong)', borderRadius: 4, padding: '0.7rem 1rem', background: 'transparent', color: 'var(--text)', cursor: 'pointer', font: 'inherit' }}>Sign out</button>}
            <Link
              to="/book"
              className="btn btn-primary"
              onClick={() => setOpen(false)}
              style={{ padding: '0.7rem 1.4rem' }}
            >
            Find services
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
