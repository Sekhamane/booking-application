import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ServiceSelector from '../components/booking/ServiceSelector'
import DateSlotPicker from '../components/booking/DateSlotPicker'
import CustomerForm from '../components/booking/CustomerForm'
import BookingSuccess from '../components/booking/BookingSuccess'
import { supabase, isOffline } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { recordBookingProof } from '../lib/blockchain'

export default function Book() {
  const { session, profile, loading: authLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [service, setService] = useState(null)
  const [coverage, setCoverage] = useState(1)
  const [date, setDate] = useState(null)
  const [slot, setSlot] = useState(null)
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [bookingDetails, setBookingDetails] = useState({})
  const [blockedDates, setBlockedDates] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (profile) queueMicrotask(() => setCustomer(current => ({ ...current, name: profile.full_name || '', phone: profile.phone || '', email: session?.user?.email || '' })))
  }, [profile, session?.user?.email])

  useEffect(() => {
    if (isOffline) return
    supabase.from('blocked_dates').select('date').then(({ data }) => setBlockedDates((data || []).map(row => row.date)))
  }, [])

  if (authLoading) return <main className="booking-auth-state" aria-live="polite">Loading your account...</main>
  if (!session) return <main className="booking-auth-state"><div className="booking-auth-card"><span className="booking-eyebrow">Book with confidence</span><h1>Sign in to continue</h1><p>Bookings are saved to your customer account so you can track updates and manage your plans in one place.</p><Link className="btn btn-primary" to="/account?mode=login">Sign in</Link><Link className="booking-create-account" to="/account?mode=register">New here? Create an account</Link></div></main>
  if (profile?.role !== 'customer') return <Navigate to="/account" replace />

  const categoryDetailsComplete = service?.category === 'flights'
    ? !!(bookingDetails.origin?.trim() && bookingDetails.destination?.trim() && ['one_way', 'return'].includes(bookingDetails.trip_type) && bookingDetails.travel_date && Number.isInteger(Number(bookingDetails.travelers)) && Number(bookingDetails.travelers) >= 1 && Number(bookingDetails.travelers) <= 20 && (bookingDetails.trip_type !== 'return' || (bookingDetails.return_date && bookingDetails.return_date >= bookingDetails.travel_date)))
    : service?.category === 'accommodation'
      ? !!(bookingDetails.destination?.trim() && bookingDetails.check_in && bookingDetails.check_out > bookingDetails.check_in && Number.isInteger(Number(bookingDetails.guests)) && Number(bookingDetails.guests) >= 1 && Number(bookingDetails.guests) <= 20 && Number.isInteger(Number(bookingDetails.rooms)) && Number(bookingDetails.rooms) >= 1 && Number(bookingDetails.rooms) <= 10)
      : service?.category === 'healthcare'
        ? ['in_person', 'telehealth'].includes(bookingDetails.visit_mode)
        : true
  const validPhone = customer.phone.replace(/[\s()+.-]/g, '').length >= 7
  const canContinue = step === 1 ? !!service : step === 2 ? !!(date && slot) : !!(customer.name?.trim() && validPhone && categoryDetailsComplete)

  const submit = async () => {
    if (isOffline) { toast.error('Connect Supabase to submit a booking.'); return }
    setSubmitting(true)
    try {
      const { error: profileError } = await supabase.from('profiles').update({ full_name: customer.name.trim(), phone: customer.phone.trim() }).eq('id', session.user.id)
      if (profileError) throw profileError
      const { data, error } = await supabase.rpc('create_booking_with_details', {
        p_service_id: service.id,
        p_coverage_level: coverage,
        p_slot_id: slot.id,
        p_booking_date: format(date, 'yyyy-MM-dd'),
        p_customer_notes: customer.notes?.trim() || null,
        p_booking_details: bookingDetails,
      })
      if (error) throw error
      let proofRecorded = false
      try { await recordBookingProof(data.id, 'requested'); proofRecorded = true }
      catch (proofError) { console.error('Booking saved; blockchain proof was not recorded', proofError); toast.error('Booking saved. Its verification proof is still pending.') }
      setResult({ ...data, date, service, slot, proofRecorded })
      setStep(4)
    } catch (error) {
      toast.error(error.message || 'Unable to place the booking.')
    } finally { setSubmitting(false) }
  }

  const joinWaitlist = async (slotId) => {
    try {
      const { error } = await supabase.rpc('join_waitlist', {
        p_service_id: service.id, p_slot_id: slotId, p_requested_date: format(date, 'yyyy-MM-dd'),
      })
      if (error) throw error
      toast.success('You have joined the waitlist for this time.')
    } catch (error) { toast.error(error.message || 'Unable to join the waitlist.') }
  }

  const selectService = (id, chosen) => {
    if (service?.id !== id) { setDate(null); setSlot(null) }
    setService(chosen)
    setCoverage(Number(chosen.coverage_levels?.[0]?.level) || 1)
    setBookingDetails({})
  }

  return <main className="booking-page">
    <div className="booking-shell">
      <header className="booking-header"><div className="booking-header-row"><div><span className="booking-eyebrow">Plan with confidence</span><h1>Find and book a service</h1><p>Choose a provider, compare available options, and request the time that works for you.</p></div><Link className="booking-status-link" to="/account/bookings">Check booking status</Link></div></header>
      <nav className="booking-progress" aria-label="Booking progress">
        {['Service', 'Time', 'Details', 'Done'].map((label, index) => <div className={`booking-progress-item ${step >= index + 1 ? 'is-current' : ''} ${step > index + 1 ? 'is-complete' : ''}`} key={label} aria-current={step === index + 1 ? 'step' : undefined}>
          <span className="booking-progress-dot">{step > index + 1 ? '✓' : index + 1}</span><span className="booking-progress-label">{label}</span>
        </div>)}
      </nav>
      <div className="booking-step-panel">
      {step === 1 && <ServiceSelector selected={service?.id} coverage={coverage} onService={selectService} onCoverage={setCoverage} />}
      {step === 2 && <DateSlotPicker date={date} slot={slot?.id} providerId={service?.provider_id} serviceId={service?.id} onDate={setDate} onSlot={setSlot} blockedDates={blockedDates} onJoinWaitlist={joinWaitlist} />}
      {step === 3 && <CustomerForm data={customer} onChange={setCustomer} category={service?.category} bookingDetails={bookingDetails} onBookingDetails={setBookingDetails} />}
      {step === 4 && result && <BookingSuccess booking={result} />}
      {step < 4 && <div className="booking-actions">
        <button className="btn btn-secondary" onClick={() => setStep(current => Math.max(1, current - 1))} disabled={step === 1}>Back</button>
        {step < 3 ? <button className="btn btn-primary" disabled={!canContinue} onClick={() => setStep(current => current + 1)}>Continue</button>
          : <button className="btn btn-primary" disabled={!canContinue || submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Request booking'}</button>}
      </div>}
      </div>
    </div>
  </main>
}
