import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Hero() {
  const { t } = useTranslation()
  const heroImgRef   = useRef(null)
  const heroInnerRef = useRef(null)
  const scrollCueRef = useRef(null)

  useEffect(() => {
    let ticking = false

    const update = () => {
      const y  = window.scrollY
      const vh = window.innerHeight

      if (heroImgRef.current) {
        heroImgRef.current.style.transform = `scaleX(-1) translateY(${(y * 0.26).toFixed(1)}px)`
      }
      if (heroInnerRef.current) {
        const p = Math.min(y / (vh * 0.72), 1)
        heroInnerRef.current.style.opacity   = (1 - p).toFixed(3)
        heroInnerRef.current.style.transform = `translateY(${(y * 0.18).toFixed(1)}px)`
      }
      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = y > 60 ? '0' : '0.85'
      }
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const ease = [0.22, 0.61, 0.36, 1]

  return (
    <section style={{
      position: 'relative',
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'flex-end',
      overflow: 'hidden',
    }}>
      {/* Background image + parallax */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <picture>
          <source
            media="(max-width: 720px)"
            srcSet="/assets/bride-veil-blush-hero-mobile.jpg"
          />
          <img
            ref={heroImgRef}
            src="/assets/bride-veil-blush-hero.jpg"
            alt="A bride with intricately adorned henna hands"
            fetchPriority="high"
            decoding="async"
            style={{
              width: '100%',
              height: '116%',
              objectFit: 'cover',
              objectPosition: 'center 88%',
              transform: 'scaleX(-1)',
              willChange: 'transform',
            }}
          />
        </picture>
        {/* Multi-layer scrim */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(90deg,
              rgba(15,10,6,0.96) 0%,
              rgba(15,10,6,0.80) 28%,
              rgba(15,10,6,0.30) 56%,
              rgba(15,10,6,0.04) 80%,
              rgba(15,10,6,0.30) 100%
            ),
            linear-gradient(0deg,
              rgba(15,10,6,0.86) 0%,
              rgba(15,10,6,0.22) 30%,
              transparent 52%
            )
          `,
        }} />
      </div>

      {/* Hero content — bottom aligned */}
      <div
        ref={heroInnerRef}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 'var(--maxw)',
          marginInline: 'auto',
          padding: 'clamp(5rem, 8vh, 7rem) clamp(1.25rem, 4vw, 3rem)',
          willChange: 'transform, opacity',
        }}
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease }}
          className="eyebrow"
          style={{ marginBottom: '1.4rem' }}
        >
          {t('hero.est')}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease }}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontSize: 'clamp(3.2rem, 9vw, 7.4rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            margin: '0 0 1.6rem',
            maxWidth: '14ch',
          }}
        >
          {t('hero.line1')}
          <span
            className="shimmer"
            style={{
              display: 'block',
              fontFamily: 'var(--font-script)',
              fontSize: '1.28em',
              marginTop: '0.05em',
              lineHeight: 0.92,
            }}
          >
            {t('hero.script')}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.44, ease }}
          className="lead"
          style={{ marginBottom: '2.4rem' }}
        >
          {t('hero.sub')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease }}
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        >
          <Link to="/book" className="btn btn-primary">
            {t('hero.cta_book')}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </Link>
          <Link to="/gallery" className="btn btn-ghost">
            {t('hero.cta_gallery')}
          </Link>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div ref={scrollCueRef} className="scroll-cue" style={{ opacity: 0.85 }}>
        <span>{t('hero.scroll', 'Scroll')}</span>
        <span className="cue-line" />
      </div>
    </section>
  )
}
