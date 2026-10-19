import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const PLACEHOLDER = [
  {
    slug: '#',
    title: 'The Art of Bridal Henna: A Guide to Choosing Your Design',
    excerpt: 'From intricate Indian patterns to flowing Arabic florals — how to choose the style that tells your story.',
    cover_image_url: null,
    published_at: '2026-05-15',
  },
  {
    slug: '#',
    title: 'Caring for Your Henna: Tips for a Deeper Stain',
    excerpt: 'The right aftercare can transform a light stain into a deep, rich colour that lasts 2–3 weeks.',
    cover_image_url: null,
    published_at: '2026-04-28',
  },
]

export default function BlogPreview() {
  const { t }     = useTranslation()
  const [posts, setPosts] = useState([])

  useEffect(() => {
    supabase.from('blog_posts')
      .select('slug, title, excerpt, cover_image_url, published_at')
      .eq('is_published', true).order('published_at', { ascending: false }).limit(2)
      .then(({ data }) => { if (data?.length) setPosts(data) })
  }, [])

  const data = posts.length ? posts : PLACEHOLDER

  return (
    <section style={{ background: 'var(--paper)' }} className="section-pad">
      <div className="container-wide">
        <div className="section-head">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <p className="eyebrow-dark">{t('blog.eyebrow', 'Journal')}</p>
            <h2 className="display-dark" style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.6rem)', marginTop: '1.1rem' }}>
              {t('blog.heading', 'From our journal')}
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              to="/blog"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.78rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--clay)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                transition: 'color 0.3s var(--ease)',
              }}
            >
              {t('blog.all_posts', 'All posts')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </Link>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {data.map((post, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.7 }}
            >
              <Link to={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                {/* Cover */}
                <div style={{
                  height: 220,
                  background: post.cover_image_url
                    ? `url(${post.cover_image_url}) center/cover`
                    : 'var(--bg-2)',
                  borderRadius: 3,
                  marginBottom: '1.4rem',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--line)',
                }}>
                  {!post.cover_image_url && (
                    <span style={{ fontFamily: 'var(--font-script)', fontSize: 36, color: 'rgba(201,138,94,0.4)' }}>✦</span>
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--clay)', marginBottom: '0.6rem' }}>
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })
                    : ''}
                </p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.45rem', color: 'var(--text-dark)', marginBottom: '0.7rem', lineHeight: 1.3 }}>
                  {post.title}
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: '0.9rem', color: 'var(--text-dark-soft)', lineHeight: 1.75 }}>
                  {post.excerpt}
                </p>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
