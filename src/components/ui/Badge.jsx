export default function Badge({ children, variant = 'gold', style }) {
  const styles = {
    gold:    { background: '#e8f0eb', color: '#14544e', border: '1px solid #bdd1c7' },
    green:   { background: '#edf7ef', color: '#166534', border: '1px solid #b8d9bf' },
    amber:   { background: '#fff6e5', color: '#854d0e', border: '1px solid #ead39e' },
    red:     { background: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)'  },
    neutral: { background: '#eef2f0', color: '#40565b', border: '1px solid #cbd7d1' },
  }

  return (
    <span style={{
      fontFamily: '"DM Sans"', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 4, display: 'inline-block',
      ...styles[variant], ...style,
    }}>
      {children}
    </span>
  )
}
