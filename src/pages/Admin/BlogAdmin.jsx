import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { Plus } from 'lucide-react'

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function PostEditor({ post, onSave, onCancel }) {
  const [title, setTitle]     = useState(post?.title || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [published, setPublished] = useState(post?.is_published || false)
  const [saving, setSaving]   = useState(false)

  const editor = useEditor({ extensions: [StarterKit], content: post?.content || '' })

  const save = async () => {
    setSaving(true)
    const slug    = post?.slug || slugify(title)
    const content = editor?.getJSON() || {}
    const data    = { title, slug, excerpt, content, is_published: published, updated_at: new Date(), ...(published && !post?.published_at ? { published_at: new Date() } : {}) }

    const { error } = post?.id
      ? await supabase.from('blog_posts').update(data).eq('id', post.id)
      : await supabase.from('blog_posts').insert(data)

    setSaving(false)
    if (error) { toast.error('Save failed.'); return }
    toast.success(published ? 'Published!' : 'Saved as draft.')
    onSave()
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 6, border: '1.5px solid rgba(44,26,14,0.2)', fontFamily: '"DM Sans"', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 28 }}>
      <input style={{ ...inputStyle, fontSize: 18, fontFamily: '"Cormorant Garamond"' }} placeholder="Post title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} placeholder="Excerpt" value={excerpt} onChange={e => setExcerpt(e.target.value)} />

      {/* TipTap editor */}
      <div style={{ border: '1.5px solid rgba(44,26,14,0.2)', borderRadius: 6, padding: '12px 14px', minHeight: 200, fontFamily: '"DM Sans"', fontSize: 14, marginBottom: 14, cursor: 'text' }}
        onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"DM Sans"', fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Publish immediately
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} className="btn-gold" disabled={saving}>{saving ? 'Saving…' : published ? 'Publish' : 'Save Draft'}</button>
        <button onClick={onCancel} className="btn-ghost" style={{ borderColor: '#2C1A0E', color: '#2C1A0E' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function BlogAdmin() {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    supabase.from('blog_posts').select('id, title, slug, is_published, published_at, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }

  useEffect(load, [])

  if (creating) return <div><PostEditor onSave={() => { setCreating(false); load() }} onCancel={() => setCreating(false)} /></div>
  if (editing)  return <div><PostEditor post={editing} onSave={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E' }}>Blog</h1>
        <button onClick={() => setCreating(true)} className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Post
        </button>
      </div>
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 8px rgba(44,26,14,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: '"DM Sans"', fontSize: 14, fontWeight: 600, color: '#2C1A0E' }}>{p.title}</div>
                <div style={{ fontFamily: '"DM Sans"', fontSize: 11, color: '#69462F', marginTop: 3 }}>{p.slug}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.is_published ? <Badge variant="green">Published</Badge> : <Badge variant="neutral">Draft</Badge>}
                <button onClick={() => setEditing(p)}
                  style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#14544e', background: 'rgba(181,147,90,0.1)', border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
          {!posts.length && <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#69462F' }}>No posts yet.</p>}
        </div>
      )}
    </div>
  )
}
