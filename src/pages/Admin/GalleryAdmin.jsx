import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useGallery } from '../../hooks/useGallery'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import { Upload, Trash2 } from 'lucide-react'

export default function GalleryAdmin() {
  const { gallery, loading, refetch } = useGallery()
  const [uploading, setUploading]     = useState(false)

  const onDrop = useCallback(async (files) => {
    setUploading(true)
    for (const file of files) {
      const ext  = file.name.split('.').pop()
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('gallery').upload(path, file)
      if (upErr) { toast.error(`Upload failed: ${file.name}`); continue }
      const url = supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl
      await supabase.from('gallery').insert({ image_url: url, is_published: true })
    }
    setUploading(false)
    toast.success(`${files.length} image(s) uploaded!`)
    refetch()
  }, [refetch])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true })

  const togglePublish = async (id, current) => {
    await supabase.from('gallery').update({ is_published: !current }).eq('id', id)
    refetch()
  }

  const deletePhoto = async (id) => {
    await supabase.from('gallery').delete().eq('id', id)
    toast.success('Deleted.')
    refetch()
  }

  return (
    <div>
      <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 32, color: '#2C1A0E', marginBottom: 24 }}>Gallery</h1>

      {/* Upload zone */}
      <div {...getRootProps()} style={{ border: '2px dashed rgba(44,26,14,0.2)', borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: isDragActive ? 'rgba(181,147,90,0.05)' : '#fafaf8', marginBottom: 28, transition: 'all 0.2s' }}>
        <input {...getInputProps()} />
        <Upload size={28} color="#14544e" style={{ marginBottom: 10 }} />
        <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#3B2417' }}>
          {uploading ? 'Uploading…' : isDragActive ? 'Drop images here' : 'Drag & drop images or click to browse'}
        </p>
        <p style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#69462F', marginTop: 4 }}>Multiple images supported</p>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ columns: '5 140px', gap: 10 }}>
          {gallery.map(img => (
            <div key={img.id} style={{ marginBottom: 10, position: 'relative', borderRadius: 8, overflow: 'hidden', breakInside: 'avoid' }}>
              <img src={img.image_url} alt="" style={{ width: '100%', display: 'block', opacity: img.is_published ? 1 : 0.4 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'flex-end', padding: 6, gap: 4, opacity: 0, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0'}
              >
                <button onClick={() => togglePublish(img.id, img.is_published)}
                  style={{ fontSize: 10, background: img.is_published ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 7px', cursor: 'pointer', fontFamily: '"DM Sans"' }}>
                  {img.is_published ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => deletePhoto(img.id)}
                  style={{ background: '#dc2626', border: 'none', borderRadius: 3, padding: '3px 6px', cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={11} color="#fff" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
