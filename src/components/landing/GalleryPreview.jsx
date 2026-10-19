import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const LOCAL_GALLERY = [
  { src: '/assets/bride-jhumar.jpg',        label: 'The portrait',   tag: 'Bridal'     },
  { src: '/assets/floral-vine-hands.jpg',   label: 'Trailing vines', tag: 'Minimalist' },
  { src: '/assets/crossed-hands-white.jpg', label: 'Open florals',   tag: 'Arabic'     },
  { src: '/assets/hands-babysbreath.jpg',   label: 'Full bridal',    tag: 'Indian Bride' },
  { src: '/assets/process-applying.jpg',    label: 'In the chair',   tag: 'Studio'     },
  { src: '/assets/detail-french-cream.jpg', label: 'Fine detail',    tag: 'Intricate'  },
]

export default function GalleryPreview() {
  const { t }       = useTranslation()
  const [items, setItems] = useState(LOCAL_GALLERY)

  useEffect(() => {
    supabase.from('gallery').select('image_url, title, service_type')
      .eq('is_published', true).limit(6).order('sort_order')
      .then(({ data }) => {
        if (data?.length) {
          setItems(data.map(d => ({ src: d.image_url, label: d.title || '', tag: d.service_type || '' })))
        }
      })
  }, [])

  return (
    <section style={{ background: 'var(--paper)' }} className="section-pad">
      <div className="container-wide">
        <div className="section-head">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <p className="eyebrow-dark">{t('gallery.eyebrow', 'Portfolio')}</p>
            <h2 className="display-dark" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)', marginTop: '1.1rem' }}>
              {t('gallery.title')}
            </h2>
          </motion.div>
          <motion.p
            className="lead-dark"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.12 }}
          >
            {t('gallery.desc', 'A glimpse of the hands, the moments and the fine detail. Drag to browse.')}
          </motion.p>
        </div>

        <motion.div
          className="gallery-track"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.1 }}
        >
          {items.map((item, i) => (
            <figure key={i} className="gallery-tile">
              <img
                src={item.src}
                alt={item.label}
                loading="lazy"
              />
              {(item.label || item.tag) && (
                <figcaption className="tile-cap">
                  {item.tag && <span>{item.tag}</span>}
                  {item.label && <b>{item.label}</b>}
                </figcaption>
              )}
            </figure>
          ))}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/gallery" className="btn btn-primary">
            {t('gallery.view_all')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
