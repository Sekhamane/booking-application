import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Gift, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { SERVICES } from '../constants/services'
import { generateVoucherCode, getVoucherExpiry } from '../lib/voucherUtils'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

export default function Voucher() {
  const [form, setForm] = useState({ purchaser_name: '', purchaser_email: '', recipient_name: '', recipient_email: '', service_id: '', coverage_level: 1, amount: 1000 })
  const [slipFile, setSlipFile]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(null)
  const { t } = useTranslation()

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [], 'application/pdf': [] }, maxSize: 10 * 1024 * 1024, multiple: false,
    onDrop: (files) => setSlipFile(files[0]),
  })

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!slipFile) { toast.error(t('voucher.error_slip')); return }
    setLoading(true)
    try {
      const ext = slipFile.name.split('.').pop()
      const path = `voucher-slips/${Date.now()}.${ext}`
      await supabase.storage.from('payment-slips').upload(path, slipFile)
      const slipUrl = supabase.storage.from('payment-slips').getPublicUrl(path).data.publicUrl

      const code = generateVoucherCode()
      const expires = format(getVoucherExpiry(), 'yyyy-MM-dd')

      const svc = SERVICES.find(s => s.id === form.service_id)
      const svcRow = svc ? await supabase.from('services').select('id').eq('slug', form.service_id).single() : null

      await supabase.from('gift_vouchers').insert({
        ...form, code, payment_slip_url: slipUrl, expires_at: expires, service_id: svcRow?.data?.id || null,
      })

      setDone({ code, expires })
    } catch { toast.error(t('voucher.error_failed')) }
    finally { setLoading(false) }
  }

  if (done) {
    return (
      <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <Gift size={52} color="#14544e" style={{ marginBottom: 20 }} />
          <h2 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 36, color: '#2C1A0E', marginBottom: 8 }}>{t('voucher.success_title')}</h2>
          <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', marginBottom: 24 }}>{t('voucher.success_sub')}</p>
          <div style={{ background: '#FAF7F2', border: '1px solid rgba(181,147,90,0.3)', borderRadius: 12, padding: 24, display: 'inline-block', marginBottom: 24 }}>
            <div style={{ fontFamily: '"DM Sans"', fontSize: 11, color: '#9A7060', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{t('voucher.code_label')}</div>
            <div style={{ fontFamily: '"Cormorant Garamond"', fontSize: 28, fontWeight: 700, color: '#14544e' }}>{done.code}</div>
            <div style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#9A7060', marginTop: 6 }}>{t('voucher.expires_at', { date: done.expires })}</div>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 6, border: '1.5px solid rgba(44,26,14,0.2)', fontFamily: '"DM Sans"', fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Gift size={36} color="#14544e" style={{ marginBottom: 12 }} />
          <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 44, color: '#2C1A0E', marginBottom: 8 }}>{t('voucher.title')}</h1>
          <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', marginBottom: 36 }}>{t('voucher.subtitle')}</p>

          <form onSubmit={submit}>
            <h3 style={{ fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#14544e', marginBottom: 12 }}>{t('booking.details_title')}</h3>
            <input style={inputStyle} placeholder={t('voucher.purchaser_name')} required value={form.purchaser_name} onChange={set('purchaser_name')} />
            <input style={inputStyle} placeholder={t('voucher.purchaser_email')} required type="email" value={form.purchaser_email} onChange={set('purchaser_email')} />

            <h3 style={{ fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#14544e', margin: '8px 0 12px' }}>{t('voucher.recipient_details')}</h3>
            <input style={inputStyle} placeholder={t('voucher.recipient_name')} value={form.recipient_name} onChange={set('recipient_name')} />
            <input style={inputStyle} placeholder={t('voucher.recipient_email')} type="email" value={form.recipient_email} onChange={set('recipient_email')} />

            <div {...getRootProps()} style={{ border: '2px dashed rgba(44,26,14,0.2)', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 24, background: slipFile ? 'rgba(181,147,90,0.05)' : '#fafaf8' }}>
              <input {...getInputProps()} />
              <Upload size={22} color="#14544e" style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#5A4030' }}>{slipFile ? slipFile.name : t('booking.upload_slip_prompt')}</p>
            </div>

            <button type="submit" className="btn-gold" style={{ width: '100%', padding: 14 }} disabled={loading}>
              {loading ? t('voucher.processing') : t('voucher.submit')}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
