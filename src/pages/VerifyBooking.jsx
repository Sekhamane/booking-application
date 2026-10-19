import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, CircleAlert, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function VerifyBooking() {
  const { reference } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.functions.invoke('verify-booking-proof', { body: { reference_code: reference } })
      .then(({ data, error: invokeError }) => {
        if (!active) return
        if (invokeError || data?.error) setError(data?.error || 'Unable to verify this booking right now.')
        else setResult(data)
        setLoading(false)
      })
    return () => { active = false }
  }, [reference])

  const proofs = result?.proofs || []
  const valid = proofs.length > 0 && proofs.every(proof => proof.valid)

  return <main style={{ maxWidth: 850, margin: '120px auto 80px', padding: 24, color: '#233238' }}>
    <p style={{ color: '#247468', textTransform: 'uppercase', letterSpacing: '.13em', fontSize: 11, fontWeight: 700 }}>Blockchain record history</p>
    <h1 style={{ fontSize: 36 }}>Verify booking record</h1>
    {loading && <p>Checking the booking record and public chain…</p>}
    {error && <p role="alert" style={{ color: '#a33' }}>{error}</p>}
    {result && <>
      <section style={{ padding: 22, background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, margin: '22px 0' }}>
        <p><strong>Booking reference:</strong> {result.booking.reference_code}</p>
        {proofs.length === 0 ? <p><CircleAlert size={17} /> No blockchain proof has been recorded yet.</p>
          : <p style={{ color: valid ? '#176b63' : '#a33', display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle2 size={18} /> {valid ? 'All recorded event hashes match the deployed contract.' : 'One or more proofs could not be verified.'}</p>}
      </section>
      <div style={{ display: 'grid', gap: 14 }}>{proofs.map((proof, index) => <article key={`${proof.event_hash}-${index}`} style={{ padding: 20, background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Event: {proof.event_type}</h2>
        <p><strong>Record hash (SHA-256):</strong><br /><code style={{ overflowWrap: 'anywhere' }}>{proof.event_hash}</code></p>
        <p><strong>Network:</strong> {proof.network} · <strong>Block:</strong> {proof.block_number}</p>
        <p><strong>Blockchain transaction:</strong><br /><code style={{ overflowWrap: 'anywhere' }}>{proof.transaction_hash}</code></p>
        {({ sepolia: 'https://sepolia.etherscan.io/tx/', 'polygon-amoy': 'https://amoy.polygonscan.com/tx/' })[proof.network] && <a href={`${({ sepolia: 'https://sepolia.etherscan.io/tx/', 'polygon-amoy': 'https://amoy.polygonscan.com/tx/' })[proof.network]}${proof.transaction_hash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={13} /></a>}
      </article>)}</div>
      <p style={{ color: '#526267', fontSize: 13, marginTop: 20 }}>Only hashes and non-identifying booking metadata are submitted on-chain. Contact details and payment documents stay off-chain.</p>
    </>}
  </main>
}
