import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase, isOffline } from '../lib/supabase'

export function useSlotAvailability(date, providerId, serviceId) {
  const [availability, setAvailability] = useState({})
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    if (!date || !providerId || !serviceId || isOffline) return () => { active = false }

    const dateStr = format(date, 'yyyy-MM-dd')
    queueMicrotask(() => {
      if (active) { setLoading(true); setError(false) }
    })
    supabase.rpc('get_provider_availability', { p_provider_id: providerId, p_date: dateStr, p_service_id: serviceId })
      .then(({ data, error }) => {
      if (!active) return
      if (error) console.error('Unable to load provider availability', error)
      if (error) setError(true)
      const rows = data || []
      setSlots(rows.map(item => ({ id: item.slot_id, label: item.label, time: item.slot_time, display_time: item.display_time })))
      setAvailability(Object.fromEntries(rows.map(item => [item.slot_id, item.is_available])))
      setLoading(false)
    }).catch(error => {
      console.error('Unable to check availability', error)
      if (active) { setAvailability({}); setSlots([]); setError(true); setLoading(false) }
    })

    return () => { active = false }
  }, [date, providerId, serviceId])

  return {
    availability: date && providerId && serviceId && !isOffline ? availability : {},
    slots: date && providerId && serviceId && !isOffline ? slots : [],
    loading: Boolean(date && providerId && serviceId && !isOffline && loading),
    error: Boolean(date && providerId && serviceId && !isOffline && error),
  }
}
