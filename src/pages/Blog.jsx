import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const { t } = useTranslation()

  useEffect(() => {
    supabase.from('blog_posts').select('id, title, slug, excerpt, cover_image_url, published_at, tags')
      .eq('is_published', true).order('published_at', { ascending: false })
      .then(({ data }) => setPosts(data || []))
  }, [])

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: '"Cormorant Garamond"', fontSize: 'clamp(36px, 6vw, 64px)', color: '#2C1A0E', marginBottom: 12 }}
        >
          {t('blog.eyebrow')}
        </motion.h1>
        <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', marginBottom: 48 }}>
          {t('blog.sub')}
        </p>

        {!posts.length ? (
          <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#14544e', textAlign: 'center', padding: '40px 0' }}>
            {t('blog.coming_soon')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {posts.map((post, i) => (
              <motion.article key={post.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ borderBottom: '1px solid rgba(44,26,14,0.1)', paddingBottom: 40 }}
              >
                <Link to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                  {post.cover_image_url && (
                    <div style={{ height: 280, background: `url(${post.cover_image_url}) center/cover`, borderRadius: 12, marginBottom: 20 }} />
                  )}
                  <p style={{ fontFamily: '"DM Sans"', fontSize: 11, color: '#14544e', letterSpacing: '0.12em', marginBottom: 10 }}>
                    {new Date(post.published_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h2 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 30, color: '#2C1A0E', marginBottom: 12 }}>{post.title}</h2>
                  <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', lineHeight: 1.75 }}>{post.excerpt}</p>
                  <span style={{ display: 'inline-block', marginTop: 14, fontFamily: '"DM Sans"', fontSize: 12, color: '#14544e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t('blog.read_more')}
                  </span>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
