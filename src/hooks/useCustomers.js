import { useState, useEffect, useCallback } from 'react'
import { supabase, isOffline } from '../lib/supabase'

export function useCustomers(search = '') {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (isOffline) {
      setCustomers([])
      setLoading(false)
      return
    }

    let query = supabase.from('customers').select('*').not('profile_id', 'is', null).order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    try {
      const { data } = await query
      setCustomers(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetch() }, [fetch])

  return { customers, loading, refetch: fetch }
}
