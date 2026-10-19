import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileImage, X, AlertCircle } from 'lucide-react'
import { DEPOSIT_AMOUNT } from '../../constants/services'
import { SERVICES } from '../../constants/services'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

export default function PaymentUpload({ booking, onFile, onVoucher, voucherCode, setVoucherCode }) {
  const [preview, setPreview] = useState(null)
  const { t } = useTranslation()

  const onDrop = useCallback((files) => {
    const file = files[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onFile(file)
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'application/pdf': [] }, maxSize: 10 * 1024 * 1024, multiple: false,
  })

  const svc = SERVICES.find(s => s.id === booking.serviceId)

  return (
    <div style={{ padding: '40px 0 24px' }}>
      <h2 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 30, color: '#2C1A0E', marginBottom: 8 }}>{t('booking.payment')}</h2>

      {/* Summary card */}
      <div style={{ background: '#FAF7F2', borderRadius: 12, padding: 24, marginBottom: 28, border: '1px solid rgba(44,26,14,0.1)' }}>
        <h3 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 20, color: '#2C1A0E', marginBottom: 16 }}>{t('booking.summary_title')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: t('booking.summary_service'),   value: t(`services.items.${svc?.id}.name`, svc?.name) || '—' },
            { label: t('booking.summary_coverage'),  value: t(`services.coverage.level${booking.coverage}`, svc?.coverageLevels.find(l => l.level === booking.coverage)?.label) || '—' },
            { label: t('booking.summary_date'),      value: booking.date ? format(booking.date, 'EEEE, MMMM d, yyyy') : '—' },
            { label: t('booking.summary_slot'),      value: t(`booking.slots.${booking.slotId}_label`, booking.slotLabel) || '—' },
            { label: t('booking.summary_price'),     value: `${(booking.price || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / ${t('services.per_side')}` },
            { label: t('booking.summary_deposit'),   value: DEPOSIT_AMOUNT.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) },
          ].map(r => (
            <div key={r.label}>
              <div style={{ fontFamily: '"DM Sans"', fontSize: 10, color: '#9A7060', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{r.label}</div>
              <div style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#2C1A0E', fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank details */}
      <div style={{ background: '#fff', border: '1px solid rgba(181,147,90,0.3)', borderRadius: 10, padding: 22, marginBottom: 24 }}>
        <h4 style={{ fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#14544e', marginBottom: 12 }}>
          {t('booking.bank_details_title')}
        </h4>
        <p style={{ fontFamily: '"DM Sans"', fontSize: 13, color: '#5A4030', lineHeight: 2 }}>
          {t('booking.bank_details_sub')}<br />
          <span style={{ color: '#9A7060', fontSize: 12 }}>
            {t('booking.bank_details_desc', { amount: DEPOSIT_AMOUNT.toLocaleString() })}
          </span>
        </p>
      </div>

      {/* Non-refundable notice */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: 'rgba(181,147,90,0.08)', borderRadius: 8, marginBottom: 24, alignItems: 'flex-start' }}>
        <AlertCircle size={15} color="#14544e" style={{ marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#7A5C40', lineHeight: 1.6 }}>
          {t('booking.deposit_notice', { amount: DEPOSIT_AMOUNT.toLocaleString() })}
        </p>
      </div>

      {/* Voucher code */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontFamily: '"DM Sans"', fontSize: 12, fontWeight: 600, color: '#2C1A0E', marginBottom: 6, display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {t('booking.voucher_code_label')}
        </label>
        <input
          style={{ padding: '11px 14px', borderRadius: 6, border: '1.5px solid rgba(44,26,14,0.2)', fontFamily: '"DM Sans"', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
          value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="GIFT-XXXX"
        />
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#B5935A' : 'rgba(44,26,14,0.2)'}`,
          borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
          background: isDragActive ? 'rgba(181,147,90,0.05)' : '#fafaf8', transition: 'all 0.2s ease',
        }}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={preview} alt="slip" style={{ maxHeight: 180, borderRadius: 8 }} />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPreview(null); onFile(null) }}
              style={{ position: 'absolute', top: -8, right: -8, background: '#2C1A0E', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer' }}>
              <X size={12} color="#FAF7F2" />
            </button>
          </div>
        ) : (
          <>
            <Upload size={28} color="#14544e" style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#5A4030', marginBottom: 4 }}>
              {isDragActive ? t('booking.drop_slip_prompt') : t('booking.upload_slip_prompt')}
            </p>
            <p style={{ fontFamily: '"DM Sans"', fontSize: 12, color: '#9A7060' }}>
              {t('booking.upload_slip_types')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
