import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SERVICES } from '../../constants/services'

const SERVICE_IMAGES = {
  intricate_indian_bride: '/assets/detail-french-cream.jpg',
  floral_arabic_bride:    '/assets/crossed-hands-white.jpg',
  minimalistic_bride:     '/assets/floral-vine-hands.jpg',
  party_guest_henna:      '/assets/detail-kalire.jpg',
}

function ServiceCard({ service, index }) {
  const [selected, setSelected] = useState(1)
  const { t } = useTranslation()
  const price = service.coverageLevels.find(l => l.level === selected)?.price || 0
  const num   = String(index + 1).padStart(2, '0')

  return (
    <article className="design-card">
      {/* Image */}
      <div className="card-thumb">
        <span className="design-num">{num}</span>
        <img src={SERVICE_IMAGES[service.id]} alt={service.name} />
      </div>

      {/* Body */}
      <div className="card-body">
        {service.isBridal && (
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--accent-soft)',
            border: '1px solid var(--line-strong)',
            borderRadius: 2,
            padding: '3px 8px',
            display: 'inline-block',
            marginBottom: '0.75rem',
          }}>
            Bridal
          </span>
        )}
        <h3>{t(`services.items.${service.id}.name`, service.name)}</h3>
        <p>{t(`services.items.${service.id}.description`, service.description)}</p>

        {/* Coverage toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--surface)',
          borderRadius: 2,
          padding: 3,
          gap: 2,
          marginTop: '1.2rem',
          border: '1px solid var(--line)',
        }}>
          {service.coverageLevels.map(l => (
            <button
              key={l.level}
              onClick={() => setSelected(l.level)}
              style={{
                flex: 1,
                padding: '5px 4px',
                borderRadius: 1,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-sans)',
                fontWeight: 400,
                letterSpacing: '0.06em',
                background: selected === l.level ? 'var(--accent)' : 'transparent',
                color: selected === l.level ? '#2a1c11' : 'var(--text-dim)',
                transition: 'all 0.25s var(--ease)',
              }}
            >
              {t(`services.coverage.level${l.level}`, l.label)}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="design-price">
          <span className="from">{t('services.per_side')}</span>
          <span className="amt">{price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
        </div>

        {/* Book link */}
        <Link
          to={`/book?service=${service.id}&coverage=${selected}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginTop: '1.2rem',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.72rem',
            fontWeight: 400,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--accent-soft)',
            textDecoration: 'none',
            transition: 'color 0.3s var(--ease)',
          }}
        >
          {t('services.book_cta')}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </Link>
      </div>
    </article>
  )
}

export default function ServicesSection() {
  const { t } = useTranslation()

  return (
    <section className="dark-section section-pad">
      <div className="container-wide">
        <div className="section-head" style={{ marginBottom: 'clamp(2rem, 4vw, 3.5rem)' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <p className="eyebrow">{t('services.eyebrow', 'Signature work')}</p>
            <h2 className="display" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)', marginTop: '1.1rem' }}>
              {t('services.title')}
            </h2>
          </motion.div>
          <motion.p
            className="lead"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.12 }}
          >
            Four considered styles, each priced by detail and length of time in the chair.
          </motion.p>
        </div>

        <motion.div
          className="designs-grid"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.1 }}
        >
          {SERVICES.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
        </motion.div>
      </div>
    </section>
  )
}
