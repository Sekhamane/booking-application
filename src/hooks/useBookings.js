import { useState, useEffect, useCallback } from 'react'
import { supabase, isOffline } from '../lib/supabase'

export function useBookings(filters = {}) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (isOffline) {
      setBookings([])
      setLoading(false)
      return
    }

    let query = supabase
      .from('bookings')
      .select('*, customers(*), services(*), provider_profiles(display_name), time_slots(*)')
      .order('created_at', { ascending: false })

    if (filters.status)     query = query.eq('status', filters.status)
    if (filters.date)       query = query.eq('booking_date', filters.date)
    if (filters.customerId) query = query.eq('customer_id', filters.customerId)

    try {
      const { data, error } = await query
      if (error) setError(error.message)
      else setBookings(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.date, filters.customerId])

  useEffect(() => { fetch() }, [fetch])

  return { bookings, loading, error, refetch: fetch }
}
