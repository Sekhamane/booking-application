import { useEffect, useState } from 'react'
import { supabase, isOffline } from '../lib/supabase'

export function useAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (isOffline) {
      setData({ monthly_bookings: [], by_category: [], by_slot: [], by_currency: [], customer_count: 0, provider_count: 0 })
      setLoading(false)
      return () => { active = false }
    }
    supabase.rpc('get_admin_analytics').then(({ data: result, error: requestError }) => {
      if (!active) return
      if (requestError) setError(requestError.message)
      else setData(result)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return { data, loading, error }
}
