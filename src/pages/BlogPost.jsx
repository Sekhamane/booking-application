import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Spinner from '../components/ui/Spinner'
import { useTranslation } from 'react-i18next'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost]     = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    supabase.from('blog_posts').select('*').eq('slug', slug).single()
      .then(({ data }) => { setPost(data); setLoading(false) })
  }, [slug])

  if (loading) return <div style={{ paddingTop: 72 }}><Spinner /></div>
  if (!post)   return <div style={{ paddingTop: 120, textAlign: 'center', fontFamily: '"DM Sans"', color: '#7A5C40' }}>{t('blog.not_found')}</div>

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2' }}>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '60px 24px' }}>
        <Link to="/blog" style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#14544e', textDecoration: 'none', marginBottom: 32, display: 'inline-block' }}>
          {t('blog.back_to_journal')}
        </Link>

        {post.cover_image_url && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            style={{ height: 360, background: `url(${post.cover_image_url}) center/cover`, borderRadius: 16, marginBottom: 32 }}
          />
        )}

        <p style={{ fontFamily: '"DM Sans"', fontSize: 11, color: '#14544e', letterSpacing: '0.12em', marginBottom: 12 }}>
          {new Date(post.published_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 'clamp(30px, 5vw, 50px)', color: '#2C1A0E', lineHeight: 1.2, marginBottom: 32 }}>
          {post.title}
        </h1>

        <div style={{ fontFamily: '"DM Sans"', fontSize: 15, color: '#4A3020', lineHeight: 1.85 }}>
          {post.excerpt && <p style={{ fontSize: 18, fontStyle: 'italic', color: '#7A5C40', marginBottom: 24 }}>{post.excerpt}</p>}
          <p style={{ color: '#7A5C40', fontSize: 14 }}>{t('blog.content_placeholder')}</p>
        </div>
      </div>
    </div>
  )
}
