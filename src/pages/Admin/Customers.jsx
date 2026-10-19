import { useState } from 'react'
import { useCustomers } from '../../hooks/useCustomers'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Crown, Search } from 'lucide-react'
import CustomerDetail from './CustomerDetail'

export default function Customers() {
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const { customers, loading } = useCustomers(search)

  return (
    <div>
      <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E', marginBottom: 24 }}>Customers</h1>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(44,26,14,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} color="#69462F" />
        <input
          style={{ border: 'none', outline: 'none', fontFamily: '"DM Sans"', fontSize: 13, flex: 1, color: '#2C1A0E', background: 'transparent' }}
          placeholder="Search by name, phone, or email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 12px rgba(44,26,14,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAF7F2' }}>
                {['Name', 'Phone', 'Email', 'Bookings', 'Status'].map(h => (
                  <th key={h} style={{ fontFamily: '"DM Sans"', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#69462F', padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} onClick={() => setSelected(c)}
                  style={{ borderTop: '1px solid rgba(44,26,14,0.06)', background: i % 2 ? '#FDFBF8' : '#fff', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13, fontWeight: 500, color: '#2C1A0E', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.is_recurring && <Crown size={13} color="#14544e" />}
                    {c.name}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13, color: '#3B2417' }}>{c.phone}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13, color: '#3B2417' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px', fontFamily: '"Cormorant Garamond"', fontSize: 18, fontWeight: 700, color: '#14544e' }}>{c.total_bookings}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.is_recurring ? <Badge variant="gold">Recurring</Badge> : <Badge variant="neutral">New</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} width={640}>
        {selected && <CustomerDetail customer={selected} />}
      </Modal>
    </div>
  )
}
