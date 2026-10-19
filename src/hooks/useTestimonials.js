import { useState, useEffect } from 'react'
import { supabase, isOffline } from '../lib/supabase'

export function useTestimonials(featuredOnly = false) {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOffline) {
      setTestimonials([])
      setLoading(false)
      return
    }

    let query = supabase
      .from('testimonials')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (featuredOnly) query = query.eq('is_featured', true)

    query.then(({ data }) => {
      setTestimonials(data || [])
      setLoading(false)
    }).catch(() => {
      setTestimonials([])
      setLoading(false)
    })
  }, [featuredOnly])

  return { testimonials, loading }
}
