import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, BarChart3, CalendarDays, CircleHelp, Database, Fingerprint, ShieldCheck, UserRound } from 'lucide-react'
import { SecurityMessageForm } from './Security/SecurityMessages'
import './PrivacyNotice.css'

const sections = [
  { id: 'information', title: 'Information we use', icon: UserRound },
  { id: 'use', title: 'How we use it', icon: CalendarDays },
  { id: 'sharing', title: 'Who can see it', icon: Database },
  { id: 'choices', title: 'Your choices', icon: ShieldCheck },
]

export default function PrivacyNotice() {
  return (
    <main className="privacy-page">
      <header className="privacy-hero">
        <div className="privacy-hero-inner">
          <p className="privacy-kicker"><span /> Teabag Booking Platform</p>
          <h1>Your privacy,<br /><em>clearly explained.</em></h1>
          <p className="privacy-intro">This notice describes the information used to run your account and bookings, who may access it, and the choices available to you.</p>
          <a className="privacy-jump" href="#privacy-details">Explore the notice <ArrowDown size={16} /></a>
          <div className="privacy-meta"><span><ShieldCheck size={15} /> Privacy notice</span><span>Updated 20 October 2026</span></div>
        </div>
        <div className="privacy-orbit" aria-hidden="true"><Fingerprint size={112} strokeWidth={0.7} /></div>
      </header>

      <div className="privacy-content" id="privacy-details">
        <aside className="privacy-toc" aria-label="On this page">
          <p>On this page</p>
          {sections.map(({ id, title }) => <a key={id} href={`#${id}`}>{title}</a>)}
          <a href="#forecasts">Forecasting</a><a href="#verification">Booking verification</a><a href="#retention">Storage & retention</a><a href="#contact">Questions</a>
        </aside>

        <article className="privacy-article">
          <div className="privacy-summary"><span className="privacy-summary-icon"><ShieldCheck size={20} /></span><p><strong>In short</strong><br />We use account and booking details to make and manage bookings. You can request an export or account deletion from your account.</p></div>

          <section id="information" className="privacy-section">
            <span className="privacy-section-icon"><UserRound size={18} /></span><div><h2>Information we use</h2>
              <p>When you create an account or make a booking, the platform may handle:</p>
              <ul><li><strong>Account details</strong>, such as your name, email address, phone number and preferred language.</li><li><strong>Booking details</strong>, such as the service and provider, requested date and time, price, status, and details or notes you submit.</li><li><strong>Waitlist and request details</strong>, including dates you ask to be notified about and any privacy requests you submit.</li><li><strong>Optional marketing preference</strong>, recorded separately from your acknowledgement of this notice.</li></ul>
              <p>Please do not put passwords, card details or sensitive health information in booking notes.</p>
            </div>
          </section>

          <section id="use" className="privacy-section">
            <span className="privacy-section-icon"><CalendarDays size={18} /></span><div><h2>How we use it</h2>
              <p>Information is used to create and maintain accounts, submit and manage bookings, send booking updates, provide support, operate waitlists, protect the service and meet applicable record-keeping obligations. Marketing updates are optional; you can book without opting in.</p>
            </div>
          </section>

          <section id="sharing" className="privacy-section">
            <span className="privacy-section-icon"><Database size={18} /></span><div><h2>Who can see it</h2>
              <p>A provider can see the contact and booking information needed to respond to a booking assigned to them. Platform administrators may access information needed to operate the service, support customers and manage records. The service is hosted using infrastructure providers; their locations and processing terms depend on the production configuration.</p>
              <p>We do not describe a fixed legal retention period here because one has not been established in the project materials. Records may be retained where needed to operate the service or meet legal obligations; deletion requests are reviewed before processing.</p>
            </div>
          </section>

          <section id="choices" className="privacy-section">
            <span className="privacy-section-icon"><ShieldCheck size={18} /></span><div><h2>Your choices and requests</h2>
              <p>From your account, you can review bookings, download an account data export, and submit a request to delete your account. Deletion requests are reviewed and may be affected by legal or operational record-keeping requirements. You can also contact support using the details in the site footer to ask about your information or request a correction.</p>
              <Link className="privacy-action" to="/account">Go to your account <ArrowUpRight size={16} /></Link>
            </div>
          </section>

          <section id="forecasts" className="privacy-section">
            <span className="privacy-section-icon"><BarChart3 size={18} /></span><div><h2>Demand forecasting</h2>
              <p>Operational forecasts use daily booking counts grouped by service and time period. The training export is designed to use aggregate counts rather than names, contact details, notes, payment information or booking references. Forecasts estimate demand and are not used to make decisions about individual customers.</p>
            </div>
          </section>

          <section id="verification" className="privacy-section">
            <span className="privacy-section-icon"><Fingerprint size={18} /></span><div><h2>Booking verification</h2>
              <p>If blockchain verification is enabled, cryptographic hashes and non-identifying event data may be published. The configured event format is intended not to include your name, email, phone number, notes, payment documents, service name or booking reference. A hash can remain on a public network and may be persistent, so verification is subject to the network and configuration used by the operator.</p>
            </div>
          </section>

          <section id="retention" className="privacy-section">
            <span className="privacy-section-icon"><Database size={18} /></span><div><h2>Storage and security</h2>
              <p>Access to account and booking records is restricted by user roles and account permissions. No online service can promise absolute security. The platform's exact retention schedule, hosting locations and applicable privacy laws depend on the operator's production setup.</p>
            </div>
          </section>

          <section id="contact" className="privacy-contact">
            <CircleHelp size={20} /><div><h2>Questions about your information?</h2><p>Write to the Security team or visit your account to manage bookings and privacy requests.</p>
              <SecurityMessageForm />
            </div><Link to="/account" aria-label="Visit your account"><ArrowUpRight size={18} /></Link>
          </section>
          <p className="privacy-footnote">This notice explains the platform's current information practices. The organization operating the service is responsible for confirming the applicable laws, contact details, retention schedule and production data handling.</p>
        </article>
      </div>
    </main>
  )
}
