import { useState, useEffect } from 'react'
import { supabase, isOffline } from '../lib/supabase'
import { getMockVouchers } from '../lib/mockDb'

export function useVouchers() {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (isOffline) {
      setVouchers(getMockVouchers())
      setLoading(false)
      return
    }

    supabase.from('gift_vouchers').select('*, services(*)').order('created_at', { ascending: false })
      .then(({ data }) => { setVouchers(data || []); setLoading(false) })
      .catch(() => { setVouchers([]); setLoading(false) })
  }, [])

  return { vouchers, loading }
}
