import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { POLICIES } from '../../constants/policies'
import { Info } from 'lucide-react'

export default function PoliciesSection() {
  const { t } = useTranslation()

  return (
    <section style={{ background: '#FAF7F2', padding: '80px 24px', borderTop: '1px solid rgba(44,26,14,0.08)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontFamily: '"Cormorant Garamond"', fontSize: 'clamp(28px, 4vw, 42px)', textAlign: 'center', marginBottom: 48, color: '#2C1A0E' }}
        >
          {t('policies.title')}
        </motion.h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {POLICIES.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              style={{ display: 'flex', gap: 16, padding: '20px 24px', background: '#fff', borderRadius: 10, boxShadow: '0 1px 12px rgba(44,26,14,0.06)', alignItems: 'flex-start' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(181,147,90,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Info size={14} color="#14544e" />
              </div>
              <div>
                <h4 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 18, fontWeight: 600, color: '#2C1A0E', marginBottom: 4 }}>{t(`policies.items.${p.id}.title`, p.title)}</h4>
                <p style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#7A5C40', lineHeight: 1.7 }}>{t(`policies.items.${p.id}.body`, p.body)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
