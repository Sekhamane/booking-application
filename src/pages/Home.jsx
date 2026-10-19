import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarCheck2, Hotel, Plane, Stethoscope, BriefcaseBusiness } from 'lucide-react'

const categories = [
  { name: 'Flights', detail: 'Compare and reserve travel services.', icon: Plane, category: 'flights' },
  { name: 'Stays', detail: 'Find and book hotels and accommodation.', icon: Hotel, category: 'accommodation' },
  { name: 'Healthcare', detail: 'Schedule appointments with care providers.', icon: Stethoscope, category: 'healthcare' },
  { name: 'More services', detail: 'Discover providers across other categories.', icon: BriefcaseBusiness, category: 'general' },
]

export default function Home() {
  return (
    <main style={{ paddingTop: 76, color: '#203238', background: '#f7f8f5' }}>
      <section style={{ padding: 'clamp(64px, 11vw, 132px) 24px 80px', background: 'linear-gradient(135deg, #e8f0eb, #f7f8f5 62%)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{ color: '#247468', letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>One place to plan what matters</p>
          <h1 style={{ maxWidth: 760, fontSize: 'clamp(42px, 7vw, 78px)', lineHeight: 1.02, letterSpacing: '-.045em', margin: '20px 0' }}>Book trusted services with less back and forth.</h1>
          <p style={{ maxWidth: 620, color: '#5b6c70', fontSize: 18, lineHeight: 1.65 }}>Find flights, accommodation, healthcare appointments, and other services. Compare availability and keep your bookings together.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30 }}>
            <Link to="/book" className="btn btn-primary">Explore services <ArrowUpRight size={16} /></Link>
            <Link to="/account?mode=register" className="btn btn-secondary">Create an account</Link>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '76px 24px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
          <div><p style={{ color: '#247468', textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 11, fontWeight: 700 }}>Explore categories</p><h2 style={{ fontSize: 34, margin: '8px 0 0' }}>Start with what you need</h2></div>
          <Link to="/book" style={{ color: '#176b63', fontWeight: 600 }}>Browse all services <ArrowUpRight size={15} /></Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {categories.map(({ name, detail, icon: Icon, category }) => (
            <Link key={category} to={`/book?category=${category}`} style={{ minHeight: 190, padding: 24, borderRadius: 14, background: '#fff', border: '1px solid #dce5e0', color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
              <Icon size={23} color="#247468" />
              <h3 style={{ fontSize: 21, margin: '24px 0 7px' }}>{name}</h3>
              <p style={{ color: '#526267', lineHeight: 1.5, margin: 0 }}>{detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ background: '#203238', color: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
          {[['01', 'Find a service', 'Browse providers and compare the details that matter.'], ['02', 'Choose a time', 'See availability and request the option that works for you.'], ['03', 'Manage your plans', 'Keep booking updates and history together in your account.']].map(([n, title, body]) => (
            <div key={n}><span style={{ color: '#8bc3b0', fontSize: 13 }}>{n}</span><h3 style={{ fontSize: 23, margin: '12px 0 8px' }}>{title}</h3><p style={{ color: '#c5d2d1', lineHeight: 1.6, margin: 0 }}>{body}</p></div>
          ))}
        </div>
        <div style={{ maxWidth: 1120, margin: '36px auto 0' }}><CalendarCheck2 size={22} color="#8bc3b0" /></div>
      </section>
    </main>
  )
}
