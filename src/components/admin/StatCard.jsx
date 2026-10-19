export default function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '22px 24px', boxShadow: '0 1px 12px rgba(44,26,14,0.07)' }}>
      <div style={{ fontFamily: '"DM Sans"', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#69462F', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: '"Cormorant Garamond"', fontSize: 36, fontWeight: 700, color: accent || '#2C1A0E' }}>{value}</div>
      {sub && <div style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#14544e', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
