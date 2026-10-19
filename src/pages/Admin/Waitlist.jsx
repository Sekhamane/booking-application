import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

export default function Waitlist() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('waitlist').select('*, customers(*), profiles(full_name, phone, email), time_slots(*), services(*)')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [])

  const notify = async (id) => {
    await supabase.from('waitlist').update({ notified: true, notified_at: new Date(), claim_expires_at: new Date(Date.now() + 6 * 3600 * 1000) }).eq('id', id)
    toast.success('Customer notified!')
    setEntries(prev => prev.map(e => e.id === id ? { ...e, notified: true } : e))
  }

  return (
    <div>
      <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E', marginBottom: 24 }}>Waitlist</h1>
      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 12px rgba(44,26,14,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAF7F2' }}>
                {['Customer', 'Requested Date', 'Slot', 'Service', 'Notified', 'Claimed', 'Action'].map(h => (
                  <th key={h} style={{ fontFamily: '"DM Sans"', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#69462F', padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={{ borderTop: '1px solid rgba(44,26,14,0.06)', background: i % 2 ? '#FDFBF8' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13 }}>{e.customers?.name}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13 }}>{e.requested_date}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, color: '#3B2417' }}>{e.time_slots?.label}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, color: '#3B2417' }}>{e.services?.name}</td>
                  <td style={{ padding: '12px 16px' }}>{e.notified ? <Badge variant="green">Yes</Badge> : <Badge variant="neutral">No</Badge>}</td>
                  <td style={{ padding: '12px 16px' }}>{e.claimed ? <Badge variant="green">Claimed</Badge> : <Badge variant="neutral">—</Badge>}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {!e.notified && (
                      <button onClick={() => notify(e.id)}
                        style={{ fontFamily: '"DM Sans"', fontSize: 11, fontWeight: 600, color: '#14544e', background: 'rgba(181,147,90,0.1)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                        Notify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!entries.length && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', fontFamily: '"DM Sans"', fontSize: 14, color: '#69462F' }}>Waitlist is empty</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
