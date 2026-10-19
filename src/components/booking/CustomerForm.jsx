export default function CustomerForm({ data, onChange, category, bookingDetails, onBookingDetails }) {
  const set = key => event => onChange({ ...data, [key]: event.target.value })
  const setDetail = key => event => onBookingDetails({ ...bookingDetails, [key]: event.target.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value })
  const today = new Date()
  today.setDate(today.getDate() + 1)
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const inputStyle = { width: '100%', padding: 12, borderRadius: 6, border: '1px solid #bdcbc5', background: '#fff', color: '#233238', boxSizing: 'border-box', font: 'inherit' }
  return <section style={{ padding: '40px 0 24px', color: '#233238' }}>
    <p style={{ color: '#247468', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 700 }}>Step 3 · Your details</p>
    <h2 style={{ fontSize: 32, margin: '8px 0' }}>Confirm your contact details</h2>
    <p style={{ color: '#526267', marginBottom: 28 }}>We use these details to manage your booking and send service updates. Please avoid entering payment card details or sensitive medical information in notes.</p>
    <div style={{ display: 'grid', gap: 16, maxWidth: 620 }}>
      <label>Full name<input style={inputStyle} autoComplete="name" value={data.name || ''} onChange={set('name')} required /></label>
      <label>Phone number<input style={inputStyle} autoComplete="tel" type="tel" inputMode="tel" minLength={7} maxLength={30} placeholder="e.g. +27 82 123 4567" value={data.phone || ''} onChange={set('phone')} required /><small style={{ display: 'block', color: '#526267', marginTop: 5 }}>Include your country code so the provider can reach you.</small></label>
      <label>Email<input style={{ ...inputStyle, background: '#edf1ef' }} type="email" value={data.email || ''} readOnly /></label>
      {category === 'flights' && <section style={{ display: 'grid', gap: 16, padding: 18, background: '#edf5f1', borderRadius: 8 }}>
        <h3 style={{ margin: 0 }}>Flight request details</h3>
        <label>From<input style={inputStyle} maxLength={120} value={bookingDetails.origin || ''} onChange={setDetail('origin')} required /></label>
        <label>To<input style={inputStyle} maxLength={120} value={bookingDetails.destination || ''} onChange={setDetail('destination')} required /></label>
        <label>Trip type<select style={inputStyle} value={bookingDetails.trip_type || ''} onChange={event => {
          const next = { ...bookingDetails, trip_type: event.target.value }
          if (event.target.value === 'one_way') delete next.return_date
          onBookingDetails(next)
        }} required><option value="" disabled>Select one</option><option value="one_way">One way</option><option value="return">Return</option></select></label>
        <label>Travel date<input style={inputStyle} type="date" min={minimumDate} value={bookingDetails.travel_date || ''} onChange={setDetail('travel_date')} required /></label>
        {bookingDetails.trip_type === 'return' && <label>Return date<input style={inputStyle} type="date" min={bookingDetails.travel_date || minimumDate} value={bookingDetails.return_date || ''} onChange={setDetail('return_date')} required /></label>}
        <label>Travelers<input style={inputStyle} type="number" min="1" max="20" step="1" value={bookingDetails.travelers ?? ''} onChange={setDetail('travelers')} required /></label>
      </section>}
      {category === 'accommodation' && <section style={{ display: 'grid', gap: 16, padding: 18, background: '#edf5f1', borderRadius: 8 }}>
        <h3 style={{ margin: 0 }}>Stay request details</h3>
        <label>Destination<input style={inputStyle} maxLength={120} value={bookingDetails.destination || ''} onChange={setDetail('destination')} required /></label>
        <label>Check-in<input style={inputStyle} type="date" min={minimumDate} value={bookingDetails.check_in || ''} onChange={setDetail('check_in')} required /></label>
        <label>Check-out<input style={inputStyle} type="date" min={bookingDetails.check_in || minimumDate} value={bookingDetails.check_out || ''} onChange={setDetail('check_out')} required /></label>
        <label>Guests<input style={inputStyle} type="number" min="1" max="20" step="1" value={bookingDetails.guests ?? ''} onChange={setDetail('guests')} required /></label>
        <label>Rooms<input style={inputStyle} type="number" min="1" max="10" step="1" value={bookingDetails.rooms ?? ''} onChange={setDetail('rooms')} required /></label>
      </section>}
      {category === 'healthcare' && <section style={{ display: 'grid', gap: 12, padding: 18, background: '#edf5f1', borderRadius: 8 }}>
        <h3 style={{ margin: 0 }}>Appointment preference</h3>
        <label>Visit type<select style={inputStyle} value={bookingDetails.visit_mode || ''} onChange={setDetail('visit_mode')} required><option value="" disabled>Select one</option><option value="in_person">In person</option><option value="telehealth">Telehealth</option></select></label>
        <p style={{ color: '#40565b', margin: 0, fontSize: 13 }}>Do not enter symptoms, diagnoses, or medical record details here. The provider will contact you through the appropriate private channel.</p>
      </section>}
      <label>Notes for the provider <span style={{ color: '#526267' }}>(optional)</span><textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} maxLength={2000} value={data.notes || ''} onChange={set('notes')} /></label>
    </div>
  </section>
}
