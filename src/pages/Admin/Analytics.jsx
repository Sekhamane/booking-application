import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line } from 'recharts'
import { useAnalytics } from '../../hooks/useAnalytics'
import Spinner from '../../components/ui/Spinner'

const COLORS = ['#247468', '#6f9b8e', '#8bc3b0', '#b8d7ca', '#d6e7dd']
const card = { background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 20 }

export default function Analytics() {
  const { data, loading, error } = useAnalytics()
  if (loading) return <Spinner />
  if (error) return <div><h1>Booking analytics</h1><p role="alert">{error}</p></div>

  const monthly = (data?.monthly_bookings || []).map(row => ({
    ...row,
    month: new Date(`${row.month}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
  }))
  const category = (data?.by_category || []).map(row => ({ ...row, name: row.name.replaceAll('_', ' ') }))

  return <div style={{ color: '#233238' }}>
    <h1 style={{ fontSize: 32, marginBottom: 8 }}>Booking analytics</h1>
    <p style={{ color: '#526267' }}>Counts cover requested, confirmed, in-progress, and completed bookings. Amounts remain separated by currency.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, margin: '20px 0' }}>
      {[['Customers', data?.customer_count || 0], ['Active providers', data?.provider_count || 0], ['Bookings · 6 months', monthly.reduce((sum, row) => sum + row.bookings, 0)], ['Service categories', category.length]].map(([label, value]) => <section key={label} style={card}><span style={{ color: '#526267', fontSize: 12 }}>{label}</span><strong style={{ display: 'block', fontSize: 24, marginTop: 7 }}>{value}</strong></section>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
      <section style={card}><h2>Bookings by month</h2><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="bookings" stroke="#247468" /></LineChart></ResponsiveContainer></div></section>
      <section style={card}><h2>Bookings by category</h2><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={category} dataKey="bookings" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>{category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></section>
      <section style={{ ...card, gridColumn: '1 / -1' }}><h2>Bookings by time slot</h2><div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.by_slot || []} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={130} /><Tooltip /><Bar dataKey="bookings" fill="#6f9b8e" /></BarChart></ResponsiveContainer></div></section>
      <section style={{ ...card, gridColumn: '1 / -1' }}><h2>Confirmed value by currency</h2>{data?.by_currency?.length ? <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{data.by_currency.map(row => <div key={row.currency} style={{ padding: 14, borderRadius: 8, background: '#edf5f1', minWidth: 140 }}><span>{row.currency}</span><strong style={{ display: 'block', fontSize: 20, marginTop: 5 }}>{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>)}</div> : <p>No confirmed booking value to report yet.</p>}</section>
    </div>
  </div>
}
