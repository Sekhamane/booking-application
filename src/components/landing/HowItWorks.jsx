import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const STEPS = [
  {
    key: 'step1',
    idx: 'i',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/>
        <path d="M3 9h18M8 2.5v4M16 2.5v4"/>
        <circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    key: 'step2',
    idx: 'ii',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/>
        <path d="M9 8h6M9 12h6M9 16h3"/>
      </svg>
    ),
  },
  {
    key: 'step3',
    idx: 'iii',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M12 3l1.6 4.2L18 8.8l-3.4 2.7 1 4.5L12 13.6 8.4 16l1-4.5L6 8.8l4.4-1.6z"/>
        <path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>
      </svg>
    ),
  },
]

export default function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section
      className="dark-section section-pad"
      style={{ background: 'var(--bg-2)' }}
    >
      <div className="container-wide">
        <div className="section-head">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <p className="eyebrow">{t('how.eyebrow')}</p>
            <h2 className="display" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)', marginTop: '1.1rem' }}>
              {t('how.title')}
            </h2>
          </motion.div>
          <motion.p
            className="lead"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.12 }}
          >
            {t('how.desc', 'From first choice to the moment you leave adorned — kept simple and unhurried.')}
          </motion.p>
        </div>

        <div className="process-grid">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.key}
              className="process-step"
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.14, duration: 0.8 }}
            >
              <div className="step-ring">
                {step.icon}
                <span className="step-idx">{step.idx}</span>
              </div>
              <h3>{t(`how.${step.key}_title`)}</h3>
              <p>{t(`how.${step.key}_desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
