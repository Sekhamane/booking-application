import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import StarRating from '../../components/ui/StarRating'
import toast from 'react-hot-toast'
import { Star } from 'lucide-react'

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading]           = useState(true)

  const load = () => {
    supabase.from('testimonials').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setTestimonials(data || []); setLoading(false) })
  }

  useEffect(load, [])

  const update = async (id, changes) => {
    await supabase.from('testimonials').update(changes).eq('id', id)
    toast.success('Updated.')
    load()
  }

  return (
    <div>
      <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E', marginBottom: 24 }}>Reviews</h1>
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {testimonials.map(t => (
            <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 1px 12px rgba(44,26,14,0.07)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <StarRating value={t.rating} readonly size={14} />
                  {t.is_featured && <Badge variant="gold"><Star size={10} /> Featured</Badge>}
                  {t.is_published ? <Badge variant="green">Published</Badge> : <Badge variant="neutral">Unpublished</Badge>}
                </div>
                <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#4A3020', lineHeight: 1.7, marginBottom: 8 }}>"{t.review_text}"</p>
                <p style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#69462F' }}>{t.customer_name} · {t.service_type}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => update(t.id, { is_published: !t.is_published })}
                  style={{ fontFamily: '"DM Sans"', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', background: t.is_published ? '#fef2f2' : '#f0fdf4', color: t.is_published ? '#dc2626' : '#16a34a' }}>
                  {t.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => update(t.id, { is_featured: !t.is_featured })}
                  style={{ fontFamily: '"DM Sans"', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 4, border: '1px solid rgba(181,147,90,0.3)', cursor: 'pointer', background: 'transparent', color: '#14544e' }}>
                  {t.is_featured ? 'Unfeature' : 'Feature'}
                </button>
              </div>
            </div>
          ))}
          {!testimonials.length && <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#69462F' }}>No reviews yet.</p>}
        </div>
      )}
    </div>
  )
}
