import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'

export default function ConsultationForm({ onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', occasion_type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 6, border: '1.5px solid rgba(44,26,14,0.2)', fontFamily: '"DM Sans"', fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('consultations').insert(form)
    setLoading(false)
    if (error) { toast.error(t('booking.group_error')); return }
    toast.success(t('booking.group_success'))
    onClose?.()
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <h3 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 26, color: '#2C1A0E', marginBottom: 6 }}>{t('booking.group_quote')}</h3>
      <p style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#7A5C40', marginBottom: 24 }}>
        {t('booking.group_quote_sub')}
      </p>
      <form onSubmit={submit}>
        <input style={inputStyle} placeholder={t('booking.group_field_name')} required value={form.name} onChange={set('name')} />
        <input style={inputStyle} placeholder={t('booking.group_field_phone')} required value={form.phone} onChange={set('phone')} type="tel" />
        <input style={inputStyle} placeholder={t('booking.group_field_email')} required value={form.email} onChange={set('email')} type="email" />
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.occasion_type} onChange={set('occasion_type')}>
          <option value="">{t('booking.occasion_placeholder')}</option>
          {['Wedding', 'Engagement', 'Eid', 'Birthday', 'Party', 'Other'].map(o => (
            <option key={o} value={o.toLowerCase()}>{t(`booking.occasions.${o.toLowerCase()}`, o)}</option>
          ))}
        </select>
        <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
          placeholder={t('booking.group_field_message')}
          value={form.message} onChange={set('message')} />
        <button type="submit" className="btn-gold" style={{ width: '100%', padding: '14px' }} disabled={loading}>
          {loading ? t('booking.sending') : t('booking.group_submit')}
        </button>
      </form>
    </div>
  )
}
