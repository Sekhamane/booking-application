import { useVouchers } from '../../hooks/useVouchers'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Vouchers() {
  const { vouchers, loading } = useVouchers()

  const validate = async (id) => {
    await supabase.from('gift_vouchers').update({ is_validated: true }).eq('id', id)
    toast.success('Voucher validated!')
    window.location.reload()
  }

  return (
    <div>
      <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E', marginBottom: 24 }}>Gift Vouchers</h1>
      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 12px rgba(44,26,14,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAF7F2' }}>
                {['Code', 'Purchaser', 'Recipient', 'Amount', 'Status', 'Expires', 'Action'].map(h => (
                  <th key={h} style={{ fontFamily: '"DM Sans"', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#69462F', padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v, i) => (
                <tr key={v.id} style={{ borderTop: '1px solid rgba(44,26,14,0.06)', background: i % 2 ? '#FDFBF8' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 600, color: '#14544e' }}>{v.code}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13 }}>{v.purchaser_name}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13, color: '#3B2417' }}>{v.recipient_name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13, fontWeight: 600 }}>{v.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {v.is_redeemed ? <Badge variant="neutral">Redeemed</Badge>
                      : v.is_validated ? <Badge variant="green">Active</Badge>
                      : <Badge variant="amber">Pending</Badge>}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, color: '#3B2417' }}>{v.expires_at}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {!v.is_validated && !v.is_redeemed && (
                      <button onClick={() => validate(v.id)}
                        style={{ fontFamily: '"DM Sans"', fontSize: 11, fontWeight: 600, color: '#16a34a', background: 'rgba(34,168,69,0.1)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                        Validate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
