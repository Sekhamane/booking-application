import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Settings() {
  const [blocked, setBlocked] = useState([])
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('blocked_dates').select('date, reason').order('date')
    if (error) toast.error('Unable to load blocked dates.')
    setBlocked(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = async day => {
    const date = format(day, 'yyyy-MM-dd')
    const found = blocked.find(row => row.date === date)
    const result = found
      ? await supabase.from('blocked_dates').delete().eq('date', date)
      : await supabase.from('blocked_dates').insert({ date, reason: 'Platform unavailable' })
    if (result.error) toast.error(result.error.message)
    else { toast.success(found ? 'Date reopened.' : 'Date blocked.'); load() }
  }

  return <div style={{ color: '#233238' }}>
    <h1 style={{ fontSize: 32 }}>Platform settings</h1>
    <section style={{ background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 22 }}>
      <h2>Platform-wide unavailable dates</h2>
      <p style={{ color: '#526267' }}>Select a date to prevent booking across all providers. Providers manage their own time off in their workspace.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <DayPicker mode="multiple" selected={blocked.map(row => new Date(`${row.date}T12:00:00`))} onDayClick={toggle} modifiersStyles={{ selected: { background: '#b84c43', color: '#fff' } }} />
        <div><h3>Blocked dates</h3>{blocked.length ? blocked.map(row => <p key={row.date}>{row.date} · {row.reason}</p>) : <p>No platform-wide dates are blocked.</p>}</div>
      </div>
    </section>
  </div>
}
