import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'support@example.com'
const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || ''

export default function Footer() {
  return <footer className="site-footer">
    <div className="container-wide">
      <div className="footer-grid">
        <div className="footer-brand"><div><p className="footer-name">Teabag Booking Platform</p><p className="footer-tag">Find providers, make bookings, and manage every update in one place.</p></div></div>
        <div className="footer-col">
          <span className="col-head">Explore</span>
          <Link to="/">Home</Link><Link to="/book">Find services</Link><Link to="/account">My account</Link>
          <Link to="/privacy">Privacy notice</Link>
        </div>
        <div className="footer-col">
          <span className="col-head">Support</span>
          <a href={`mailto:${CONTACT_EMAIL}`}><Mail size={13} /> {CONTACT_EMAIL}</a>
          {CONTACT_PHONE && <a href={`tel:${CONTACT_PHONE}`}><Phone size={13} /> {CONTACT_PHONE}</a>}
        </div>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} · Teabag Booking Platform</span>
        <span className="footer-flourish">Book with clarity</span>
        <Link to="/admin/login" style={{ fontSize: '.66rem', letterSpacing: '.1em', color: 'var(--text-dim)', opacity: .5, textDecoration: 'none' }}>Staff sign in</Link>
      </div>
    </div>
  </footer>
}
