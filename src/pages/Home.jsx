import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarCheck2, Check, Clock3, HeartPulse, Hotel, Plane, ShieldCheck, Sparkles } from 'lucide-react'

const categories = [
  { name: 'Flights', detail: 'Make your next journey easier to plan.', icon: Plane, category: 'flights', tint: 'mint' },
  { name: 'Stays', detail: 'Find a place that feels right for the trip.', icon: Hotel, category: 'accommodation', tint: 'sand' },
  { name: 'Healthcare', detail: 'Book time with care professionals.', icon: HeartPulse, category: 'healthcare', tint: 'rose' },
  { name: 'More services', detail: 'Explore helpful services near you.', icon: Sparkles, category: 'general', tint: 'blue' },
]

export default function Home() {
  return <main className="market-home">
    <section className="market-hero">
      <div className="market-hero-glow" />
      <div className="market-hero-inner">
        <div className="market-hero-copy">
          <span className="market-kicker"><span /> A better way to book</span>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p>From flights and stays to healthcare, find trusted services and bring every plan together in one place.</p>
          <div className="market-actions"><Link to="/book" className="market-button">Explore services <ArrowUpRight size={17} /></Link><a className="market-text-link" href="#categories">See what you can book <ArrowDown size={15} /></a></div>
          <div className="market-trust"><span><ShieldCheck size={16} /> Trusted providers</span><i /><span>Plans in one place</span></div>
        </div>
        <div className="market-preview-wrap" aria-label="Booking preview">
          <div className="market-orbit orbit-one" /><div className="market-orbit orbit-two" />
          <div className="market-preview">
            <div className="preview-top"><span className="preview-brand"><span className="preview-mark"><CalendarCheck2 size={17} /></span> Your next plan</span><span className="preview-dots">•••</span></div>
            <div className="preview-label">UPCOMING BOOKING</div>
            <h2>Somewhere<br />to look forward to.</h2>
            <div className="preview-booking"><span className="preview-icon"><Plane size={19} /></span><span><b>Travel, your way</b><small>Compare options · Book with confidence</small></span><ArrowRight size={16} /></div>
            <div className="preview-footer"><span><Check size={14} /> Easy to manage</span><span><Clock3 size={14} /> On your time</span></div>
          </div>
          <div className="float-chip chip-top"><span className="chip-spark">✳</span><span><b>One simple place</b><small>For the things you need</small></span></div>
          <div className="float-chip chip-bottom"><span className="chip-check"><Check size={15} /></span><span><b>Booking confirmed</b><small>Your plans, together</small></span></div>
        </div>
      </div>
      <div className="market-hero-bottom"><span>BOOK THE NEXT CHAPTER</span><span className="hero-bottom-line" /><span>01 / 04</span></div>
    </section>

    <section className="market-categories" id="categories">
      <div className="market-section-head"><div><span className="market-section-kicker">Thoughtfully connected</span><h2>Where do you want<br />to <em>begin?</em></h2></div><p>Good plans start with finding the right people and services. Explore a category and take it from there.</p></div>
      <div className="market-category-grid">{categories.map(({ name, detail, icon: Icon, category, tint }, index) => <Link key={category} to={`/book?category=${category}`} className={`market-category-card tint-${tint}`}><span className="category-number">0{index + 1}</span><span className="category-icon"><Icon size={23} strokeWidth={1.7} /></span><span className="category-copy"><b>{name}</b><small>{detail}</small></span><span className="category-arrow"><ArrowUpRight size={18} /></span></Link>)}</div>
      <div className="market-category-foot"><span>YOUR PLANS, YOUR PACE</span><Link to="/book">Browse every service <ArrowRight size={15} /></Link></div>
    </section>

    <section className="market-how"><div className="how-inner"><div className="how-heading"><span className="market-section-kicker">Simple by design</span><h2>Less back and forth.<br /><em>More looking forward.</em></h2><p>From finding a service to managing the details, your next step stays clear.</p><Link to="/account?mode=register" className="how-link">Create your account <ArrowUpRight size={16} /></Link></div><div className="how-steps">{[['01', 'Find your fit', 'Browse providers and compare the details that matter.'], ['02', 'Choose your time', 'Check availability and request the time that works for you.'], ['03', 'Keep it together', 'Follow booking updates and manage your plans in one place.']].map(([num, title, body]) => <article key={num} className="how-step"><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowUpRight size={17} /></article>)}</div></div><div className="how-bottom"><span>MADE FOR THE WAY YOU BOOK TODAY</span><span>FLIGHTS <i /> STAYS <i /> HEALTHCARE <i /> MORE</span></div></section>
  </main>
}
