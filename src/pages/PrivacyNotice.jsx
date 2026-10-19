import { Link } from 'react-router-dom'

const section = { marginTop: 24 }

export default function PrivacyNotice() {
  return <main style={{ maxWidth: 820, margin: '120px auto 80px', padding: 24, color: '#233238', lineHeight: 1.7 }}>
    <p style={{ color: '#247468', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 700 }}>Teabag Booking Platform</p>
    <h1 style={{ fontSize: 36, lineHeight: 1.15 }}>Privacy notice</h1>
    <p>This notice explains how the platform uses account and booking information. The platform operator should add its legal name, contact details, applicable retention periods, and jurisdiction-specific rights before accepting real customers.</p>
    <section style={section}><h2>Information we use</h2><p>Account details include your name, email address, and phone number. Booking records include the selected service, provider, date and time, price, status, and any notes you submit. Providers can see contact details and booking information for requests assigned to them; platform administrators can access information needed to operate and support bookings.</p></section>
    <section style={section}><h2>How it is used</h2><p>We use this information to create and manage your account, make and update bookings, contact you about a booking, provide customer support, protect the service, and meet applicable record-keeping duties. Do not include passwords, payment card details, or sensitive medical details in booking notes.</p></section>
    <section style={section}><h2>Optional updates</h2><p>Product and service updates are optional. You can create an account and book without agreeing to marketing updates. The platform records your choice separately from acceptance of this notice.</p></section>
    <section style={section}><h2>Demand forecasting</h2><p>Booking demand forecasts use daily counts grouped by service and time period. The training export is designed to contain aggregate counts rather than names, contact details, notes, payment information, or booking references. Forecasts are operational estimates, not decisions about individual customers.</p></section>
    <section style={section}><h2>Booking verification</h2><p>If blockchain verification is enabled, the system publishes cryptographic hashes and non-identifying event data. It does not publish your name, email, phone number, booking notes, payment documents, service name, or booking reference to the blockchain. Hashes may still be persistent, so the operator should review the deployed event format and privacy requirements.</p></section>
    <section style={section}><h2>Your choices and requests</h2><p>You can review your bookings, download an account export, and submit an account deletion request from your account. Deletion requests are reviewed and may be subject to applicable legal or operational retention requirements. The operator should publish its response timeline and retention rules.</p></section>
    <p style={{ marginTop: 34, color: '#526267' }}>Questions? Contact the support address shown in the site footer.</p>
    <Link to="/account">Return to your account</Link>
  </main>
}
