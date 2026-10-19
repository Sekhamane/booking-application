import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function AboutSection() {
  const { t } = useTranslation()

  return (
    <section style={{ background: 'var(--paper)', padding: 'clamp(5rem, 12vh, 9rem) 0' }}>
      <div className="container-wide">

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(3rem, 6vw, 5rem)', alignItems: 'center' }}>

          {/* Left: eyebrow + quote + description */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <p className="eyebrow-dark" style={{ marginBottom: '1.4rem' }}>
              {t('about.eyebrow', 'Our story')}
            </p>
            <h2
              className="display-dark"
              style={{ fontSize: 'clamp(2.1rem, 4vw, 3.2rem)', marginBottom: '1.6rem' }}
            >
              {t('about.heading', 'Devotion in every stroke')}
            </h2>
            <blockquote style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.2rem, 2vw, 1.55rem)',
              color: 'var(--text-dark)',
              lineHeight: 1.5,
              marginBottom: '1.2rem',
              borderLeft: '2px solid var(--clay)',
              paddingLeft: '1.25rem',
            }}>
              "{t('about.quote')}"
            </blockquote>
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: '0.97rem', color: 'var(--text-dark-soft)', lineHeight: 1.85 }}>
              {t('about.description')}
            </p>
          </motion.div>

          {/* Right: stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            {[
              { value: t('about.stat1', 'Est. YYYY'), label: null },
              { value: t('about.stat2', '1,000+'),   label: t('about.stat2_label', 'Hands adorned') },
              { value: t('about.stat3', '100%'),      label: t('about.stat3_label', 'Organic ingredients') },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '1.6rem 1.8rem',
                  border: '1px solid rgba(112,79,55,0.14)',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, color: 'var(--clay)' }}>
                  {s.value}
                </div>
                {s.label && (
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dark-soft)', marginTop: '0.3rem' }}>
                    {s.label}
                  </div>
                )}
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  )
}
