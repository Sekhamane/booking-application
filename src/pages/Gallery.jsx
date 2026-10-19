import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGallery } from '../hooks/useGallery'
import Lightbox from '../components/ui/Lightbox'
import Spinner from '../components/ui/Spinner'
import { useTranslation } from 'react-i18next'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Indian Bride', value: 'intricate_indian_bride' },
  { label: 'Arabic Bride', value: 'floral_arabic_bride' },
  { label: 'Minimalistic', value: 'minimalistic_bride' },
  { label: 'Party', value: 'party_guest_henna' },
]

const LOCAL_IMAGES = Array.from({ length: 30 }, (_, i) => {
  const files = [
    '08e59596-7343-4761-9ee8-34217d6474ec.JPG','0e63fd59-9073-428c-b687-4a5a3b67ffb1.JPG',
    '28fac6ce-53a8-47a6-9d9b-7fa9115b3380.JPG','2e366e89-ffd9-45c3-9f25-accd09ea6a7c.JPG',
    '32622a2d-9bd8-484b-82c5-c2ccbac8e677.JPG','473155f8-eb07-4d7a-81bf-598e849e0e76.JPG',
    '4d0d0aff-f7cc-47f7-997d-cd8ff1edb5b9.JPG','4fcb6c7c-3948-4ee3-9ac0-3041e319bff6.JPG',
    '5bfa7ab5-2c3f-4b5b-89c6-6c2a85242899.JPG','612d982f-b108-4ea5-b04d-568cbe50f8c9.JPG',
    '68872992-308a-482b-b725-7b1cc70d1f0b.JPG','6d51f71e-8950-47d7-b658-a1bb1c883448.JPG',
    'PHOTO-2026-06-01-17-43-09.jpg','PHOTO-2026-06-01-17-43-10.jpg',
  ]
  return `/assets/gallery/${files[i % files.length]}`
})

export default function Gallery() {
  const [filter, setFilter]     = useState('all')
  const [lightbox, setLightbox] = useState(null)
  const { gallery, loading }    = useGallery(filter)
  const { t } = useTranslation()
  const images = gallery.length ? gallery.map(g => g.image_url) : LOCAL_IMAGES

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: '"Cormorant Garamond"', fontSize: 'clamp(36px, 6vw, 64px)', color: '#2C1A0E', marginBottom: 12 }}
        >
          {t('gallery.heading')}
        </motion.h1>
        <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', marginBottom: 36 }}>
          {t('gallery.sub')}
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{ fontFamily: '"DM Sans"', fontSize: 12, padding: '7px 18px', borderRadius: 999, border: '1px solid', borderColor: filter === f.value ? '#2C1A0E' : 'rgba(44,26,14,0.25)', background: filter === f.value ? '#2C1A0E' : 'transparent', color: filter === f.value ? '#FAF7F2' : '#5A4030', cursor: 'pointer' }}>
              {t(`gallery.filters.${f.value}`, f.label)}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <div style={{ columns: '4 180px', gap: 10 }}>
            {images.map((src, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                onClick={() => setLightbox(i)}
                style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', breakInside: 'avoid' }}
              >
                <img src={src} alt="" loading="lazy" style={{ width: '100%', display: 'block', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  onMouseEnter={e => e.target.style.transform='scale(1.03)'}
                  onMouseLeave={e => e.target.style.transform='scale(1)'}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        images={images} index={lightbox} onClose={() => setLightbox(null)}
        onPrev={() => setLightbox(v => (v - 1 + images.length) % images.length)}
        onNext={() => setLightbox(v => (v + 1) % images.length)}
      />
    </div>
  )
}
