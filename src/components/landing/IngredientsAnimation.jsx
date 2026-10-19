import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function IngredientsAnimation() {
  const { t } = useTranslation()
  const sectionRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current

    if (!video || !section) return

    const loadAndPlay = () => {
      if (!video.dataset.loaded) {
        video.src = '/assets/ing-cone-optimized.mp4'
        video.dataset.loaded = 'true'
        video.load()
      }

      video.play().catch(() => {})
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadAndPlay()
        } else {
          video.pause()
        }
      },
      { rootMargin: '360px 0px', threshold: 0.16 }
    )

    observer.observe(section)

    return () => {
      observer.disconnect()
      video.pause()
    }
  }, [])

  return (
    <section ref={sectionRef} style={{ background: '#1d150e', width: '100%' }}>
      <div 
        style={{
          position: 'relative',
          minHeight: '100svh',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        
        {/* Full-screen video background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          width: '100%',
          height: '100%'
        }}>
          <video
            ref={videoRef}
            preload="none"
            muted
            loop
            playsInline
            poster="/assets/ing-cone-poster.jpg"
            aria-hidden="true"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: 'translateZ(0)'
            }}
          />
          {/* Vignette/Dark Overlay for text contrast */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(29, 21, 14, 0.25) 0%, rgba(29, 21, 14, 0.88) 100%)',
            pointerEvents: 'none'
          }} />
        </div>

        <div 
          style={{
            position: 'absolute',
            zIndex: 5,
            textAlign: 'center',
            padding: '0 clamp(1.25rem, 4vw, 3rem)',
            maxWidth: '880px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5.2vw, 68px)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.15, marginBottom: 16 }}>
            {t('ingredients.tagline')}
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: '1.4rem' }}>
            {t('ingredients.sub')}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(20px, 3.8vw, 38px)', color: 'var(--text)', marginBottom: '2.2rem', lineHeight: 1.35 }}>
            {t('ingredients.outro')}
          </p>
          <Link to="/book" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '1rem 2rem' }}>
            {t('ingredients.cta')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
