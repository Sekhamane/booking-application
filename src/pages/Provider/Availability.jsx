import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase, isOffline } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ProviderAvailability() {
  const { session } = useAuth()
  const [provider, setProvider] = useState(null)
  const [slots, setSlots] = useState([])
  const [schedule, setSchedule] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    if (!session?.user || isOffline) return
    const { data: providerRow } = await supabase.from('provider_profiles').select('id, is_active').eq('profile_id', session.user.id).maybeSingle()
    setProvider(providerRow)
    if (!providerRow) return
    const [slotResult, scheduleResult, timeOffResult] = await Promise.all([
      supabase.from('time_slots').select('id, label, display_time').eq('is_active', true).order('sort_order'),
      supabase.from('provider_availability').select('id, weekday, slot_id, is_available').eq('provider_id', providerRow.id),
      supabase.from('provider_time_off').select('id, date, reason').eq('provider_id', providerRow.id).gte('date', new Date().toISOString().slice(0, 10)).order('date'),
    ])
    if (slotResult.error || scheduleResult.error || timeOffResult.error) toast.error('Unable to load provider hours.')
    setSlots(slotResult.data || [])
    setSchedule(scheduleResult.data || [])
    setTimeOff(timeOffResult.data || [])
  }, [session?.user])

  useEffect(() => { load() }, [load])

  const toggle = async (weekday, slotId) => {
    if (!provider?.is_active) return
    const existing = schedule.find(item => item.weekday === weekday && item.slot_id === slotId)
    const result = existing
      ? await supabase.from('provider_availability').delete().eq('id', existing.id)
      : await supabase.from('provider_availability').insert({ provider_id: provider.id, weekday, slot_id: slotId, is_available: true })
    if (result.error) toast.error(result.error.message)
    else load()
  }

  const addTimeOff = async event => {
    event.preventDefault()
    const { error } = await supabase.from('provider_time_off').insert({ provider_id: provider.id, date, reason: reason.trim() || null })
    if (error) toast.error(error.message)
    else { toast.success('Date marked unavailable.'); setDate(''); setReason(''); load() }
  }

  if (isOffline) return <main style={{ padding: 130 }}>Connect Supabase to manage availability.</main>
  return <main style={{ maxWidth: 1050, margin: '116px auto 70px', padding: 24, color: '#233238' }}>
    <h1 style={{ fontSize: 34 }}>Working hours and availability</h1>
    {!provider && <p>Your provider profile has not been provisioned.</p>}
    {provider && !provider.is_active && <p>Your provider account is awaiting approval.</p>}
    {provider?.is_active && <>
      <p style={{ color: '#526267' }}>Choose recurring weekly time slots. Customers can request only times configured here.</p>
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'left', padding: 12 }}>Day</th>{slots.map(slot => <th key={slot.id} style={{ padding: 12 }}>{slot.label}<br /><small>{slot.display_time}</small></th>)}</tr></thead>
          <tbody>{weekdays.map((day, weekday) => <tr key={day}><th style={{ textAlign: 'left', padding: 12, borderTop: '1px solid #e6ece9' }}>{day}</th>{slots.map(slot => {
            const active = schedule.some(item => item.weekday === weekday && item.slot_id === slot.id)
            return <td key={slot.id} style={{ textAlign: 'center', borderTop: '1px solid #e6ece9', padding: 10 }}><input type="checkbox" aria-label={`${day} ${slot.label}`} checked={active} onChange={() => toggle(weekday, slot.id)} /></td>
          })}</tr>)}</tbody>
        </table>
      </div>
      <h2 style={{ marginTop: 36 }}>Dates off</h2>
      <form onSubmit={addTimeOff} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} required />
        <input placeholder="Optional reason" maxLength={200} value={reason} onChange={e => setReason(e.target.value)} />
        <button className="btn btn-primary">Block date</button>
      </form>
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>{timeOff.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: '#fff', border: '1px solid #dce5e0', borderRadius: 7 }}>{item.date} · {item.reason || 'Unavailable'}<button onClick={async () => { const { error } = await supabase.from('provider_time_off').delete().eq('id', item.id); if (error) toast.error(error.message); else load() }}>Remove</button></div>)}</div>
    </>}
  </main>
}
