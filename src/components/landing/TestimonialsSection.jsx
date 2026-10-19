import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { useTestimonials } from '../../hooks/useTestimonials'

const PLACEHOLDER = [
  { customer_name: 'Sarah M.',   rating: 5, review_text: 'The most beautiful bridal henna I could have asked for. Every detail was perfect — I kept staring at my hands all day!', service_type: 'Intricate Indian Bride' },
  { customer_name: 'Amara S.',   rating: 5, review_text: 'Absolutely stunning Arabic floral design. My guests couldn\'t stop complimenting the work. Highly recommend!', service_type: 'Floral Arabic Bride' },
  { customer_name: 'Natasha F.', rating: 5, review_text: 'Such a relaxing and professional experience. The minimalistic design was exactly what I envisioned for my engagement.', service_type: 'Minimalistic Bride' },
  { customer_name: 'Ruvini K.',  rating: 5, review_text: 'Came for party henna and left absolutely amazed. The artist is so talented and the results last so long!', service_type: 'Party / Guest Henna' },
]

export default function TestimonialsSection() {
  const { t } = useTranslation()
  const { testimonials } = useTestimonials(false)
  const data    = testimonials.length ? testimonials : PLACEHOLDER
  const scrollRef = useRef(null)

  return (
    <section style={{ background: 'var(--bg-blush)', padding: 'clamp(5rem, 12vh, 9rem) 0' }}>
      <div className="container-wide">
        <div className="section-head" style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <p className="eyebrow-dark">{t('testimonials.eyebrow', 'Client stories')}</p>
            <h2 className="display-dark" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)', marginTop: '1.1rem' }}>
              {t('testimonials.title')}
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Horizontal scroll — bleeds edge to edge */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '1.1rem',
          overflowX: 'auto',
          paddingLeft: 'max(1.25rem, calc((100vw - 1240px) / 2 + 1.25rem))',
          paddingRight: '1.25rem',
          paddingBottom: '0.5rem',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
        }}
      >
        {data.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.08 }}
            style={{
              minWidth: 320,
              maxWidth: 340,
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(8px)',
              borderRadius: 3,
              border: '1px solid rgba(112,79,55,0.12)',
              padding: '1.8rem',
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: item.rating }).map((_, j) => (
                <Star key={j} size={13} fill="var(--clay)" color="var(--clay)" />
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--text-dark)', lineHeight: 1.65, flex: 1 }}>
              "{item.review_text}"
            </p>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-dark)' }}>
                {item.customer_name}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clay)', marginTop: '0.2rem' }}>
                {item.service_type}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
