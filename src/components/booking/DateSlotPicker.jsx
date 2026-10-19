import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { addDays, format, isBefore, startOfDay } from 'date-fns'
import { useSlotAvailability } from '../../hooks/useSlotAvailability'

export default function DateSlotPicker({ date, slot, providerId, serviceId, onDate, onSlot, onJoinWaitlist, blockedDates = [] }) {
  const minDate = addDays(new Date(), 1)
  const { availability, slots, loading, error } = useSlotAvailability(date, providerId, serviceId)
  const isDisabled = d => isBefore(startOfDay(d), startOfDay(minDate)) || blockedDates.includes(format(d, 'yyyy-MM-dd'))

  return <section style={{ padding: '40px 0 24px', color: '#233238' }}>
    <p style={{ color: '#247468', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 700 }}>Step 2 · Choose a time</p>
    <h2 style={{ fontSize: 32, margin: '8px 0' }}>When would you like to go?</h2>
    <p style={{ color: '#526267', marginBottom: 24 }}>Select a date to view this provider’s scheduled availability.</p>
    <div className="booking-date-grid">
      <div style={{ padding: 18, background: '#fff', border: '1px solid #dce5e0', borderRadius: 10 }}>
        <DayPicker mode="single" selected={date} onSelect={value => { onDate(value); onSlot(null) }} disabled={isDisabled} startMonth={minDate} />
      </div>
      <div>
        <h3 style={{ fontSize: 17, marginTop: 0 }}>{date ? `Available times · ${format(date, 'EEE, MMM d')}` : 'Available times'}</h3>
        {!date && <p style={{ color: '#526267' }}>Choose a date to see the provider’s hours.</p>}
        {date && loading && <p style={{ color: '#526267' }}>Checking availability…</p>}
        {date && error && <p role="alert" style={{ color: '#8b3c31' }}>We couldn’t check availability. Please select the date again to retry.</p>}
        {date && !loading && !error && !slots.length && <p style={{ color: '#526267' }}>No times are scheduled for this date. Try another day.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {!loading && !error && slots.map(item => {
            const available = availability[item.id] === true
            return <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 8, border: `1px solid ${slot === item.id ? '#247468' : '#dce5e0'}`, background: slot === item.id ? '#edf5f1' : '#fff' }}>
              <button type="button" disabled={!available} onClick={() => onSlot(item)} style={{ border: 0, background: 'transparent', color: available ? '#233238' : '#59696e', cursor: available ? 'pointer' : 'not-allowed', textAlign: 'left' }}>
                <strong>{item.label}</strong><br /><small>{item.display_time || item.time}</small>
              </button>
              {available ? <span style={{ color: '#247468' }}>Available</span>
                : <button type="button" onClick={() => onJoinWaitlist?.(item.id)} style={{ color: '#176b63', border: '1px solid #9ab9ad', background: '#f4faf6', borderRadius: 5, padding: '7px 10px', cursor: 'pointer' }}>Join waitlist</button>}
            </div>
          })}
        </div>
      </div>
    </div>
  </section>
}
