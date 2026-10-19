import { useState, useEffect } from 'react'
import { supabase, isOffline } from '../lib/supabase'

export function useGallery(filter = '') {
  const [gallery, setGallery] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOffline) {
      setGallery([])
      setLoading(false)
      return
    }

    let query = supabase
      .from('gallery')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    if (filter && filter !== 'all') query = query.eq('service_type', filter)

    query.then(({ data }) => {
      setGallery(data || [])
      setLoading(false)
    }).catch(() => {
      setGallery([])
      setLoading(false)
    })
  }, [filter])

  return { gallery, loading }
}
