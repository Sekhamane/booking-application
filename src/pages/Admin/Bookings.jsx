import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookings } from '../../hooks/useBookings'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

const STATUS_MAP = {
  requested:          { variant: 'amber',   label: 'Requested' },
  pending_slip:       { variant: 'neutral', label: 'Pending Slip' },
  pending_validation: { variant: 'amber',   label: 'Pending Review' },
  confirmed:          { variant: 'green',   label: 'Confirmed' },
  rejected:           { variant: 'red',     label: 'Rejected' },
  expired:            { variant: 'neutral', label: 'Expired' },
  completed:          { variant: 'green',   label: 'Completed' },
  in_progress:        { variant: 'green',   label: 'In progress' },
  cancelled:          { variant: 'neutral', label: 'Cancelled' },
}

export default function Bookings({ defaultStatus = '', title = 'Bookings', emptyMessage = 'No bookings found' }) {
  const [statusFilter, setStatus] = useState(defaultStatus)
  const { bookings, loading } = useBookings({ status: statusFilter || undefined })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E' }}>{title}</h1>
        <select
          value={statusFilter} onChange={e => setStatus(e.target.value)}
          style={{ fontFamily: '"DM Sans"', fontSize: 13, padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(44,26,14,0.2)', cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 12px rgba(44,26,14,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAF7F2' }}>
                {['Reference', 'Customer', 'Service', 'Provider', 'Date', 'Slot', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ fontFamily: '"DM Sans"', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#69462F', padding: '10px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => {
                const badge = STATUS_MAP[b.status] || { variant: 'neutral', label: b.status }
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid rgba(44,26,14,0.06)', background: i % 2 ? '#FDFBF8' : '#fff' }}>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 600, color: '#14544e' }}>{b.reference_code}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 13 }}>{b.customers?.name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, color: '#3B2417' }}>{b.services?.name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12, color: '#3B2417' }}>{b.provider_profiles?.display_name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12 }}>{b.booking_date}</td>
                    <td style={{ padding: '12px 16px', fontFamily: '"DM Sans"', fontSize: 12 }}>{b.time_slots?.label}</td>
                    <td style={{ padding: '12px 16px' }}><Badge variant={badge.variant}>{badge.label}</Badge></td>
                    <td style={{ padding: '12px 16px' }}>
                      {b.status === 'requested' && (
                        <Link to={`/admin/bookings/${b.id}/validate`}
                          style={{ fontFamily: '"DM Sans"', fontSize: 11, fontWeight: 600, color: '#14544e', textDecoration: 'none', background: 'rgba(181,147,90,0.1)', padding: '4px 10px', borderRadius: 4 }}>
                          Review
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!bookings.length && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', fontFamily: '"DM Sans"', fontSize: 14, color: '#69462F' }}>{emptyMessage}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
