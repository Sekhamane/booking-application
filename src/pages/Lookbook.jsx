import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Lightbox from '../components/ui/Lightbox'
import { useTranslation } from 'react-i18next'

export default function Lookbook() {
  const [items, setItems]       = useState([])
  const [saved, setSaved]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('app-saved-looks') || '[]') } catch { return [] }
  })
  const [lightbox, setLightbox] = useState(null)
  const { t } = useTranslation()

  useEffect(() => {
    supabase.from('lookbook').select('*, gallery(image_url, caption, service_type)')
      .order('save_count', { ascending: false })
      .then(({ data }) => setItems(data || []))
  }, [])

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('app-saved-looks', JSON.stringify(next))
      return next
    })
  }

  const images = items.map(i => i.gallery?.image_url).filter(Boolean)

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: '"Cormorant Garamond"', fontSize: 'clamp(36px, 6vw, 64px)', color: '#2C1A0E', marginBottom: 12 }}
        >
          {t('lookbook.heading')}
        </motion.h1>
        <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', marginBottom: 36 }}>
          {t('lookbook.sub')}
        </p>

        {!items.length ? (
          <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#14544e', textAlign: 'center', padding: '60px 0' }}>
            {t('lookbook.coming_soon')}
          </p>
        ) : (
          <div style={{ columns: '4 180px', gap: 12 }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ marginBottom: 12, breakInside: 'avoid', position: 'relative', borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setLightbox(i)}>
                <img src={item.gallery?.image_url} alt={item.title} style={{ width: '100%', display: 'block' }} />
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <button onClick={e => { e.stopPropagation(); toggleSave(item.id) }}
                    style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', padding: 7, cursor: 'pointer', display: 'flex' }}>
                    <Heart size={16} fill={saved.includes(item.id) ? '#14544e' : 'none'} color={saved.includes(item.id) ? '#14544e' : '#FAF7F2'} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Lightbox images={images} index={lightbox} onClose={() => setLightbox(null)}
        onPrev={() => setLightbox(v => (v - 1 + images.length) % images.length)}
        onNext={() => setLightbox(v => (v + 1) % images.length)} />
    </div>
  )
}
