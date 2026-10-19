import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function BookingConfirmation() {
  const [params] = useSearchParams()
  const ref = params.get('ref') || 'BKG-XXXXXXXX-0000'
  const { t } = useTranslation()

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <CheckCircle size={56} color="#14544e" style={{ marginBottom: 20 }} />
        <h1 style={{ fontFamily: '"Cormorant Garamond"', fontSize: 40, color: '#2C1A0E', marginBottom: 12 }}>{t('booking.confirmed_title')}</h1>
        <p style={{ fontFamily: '"DM Sans"', fontSize: 14, color: '#7A5C40', marginBottom: 24 }}>
          {t('booking.confirmed_sub', { ref })}
        </p>
        <Link to="/" className="btn-gold" style={{ padding: '12px 32px' }}>{t('booking.back_to_home')}</Link>
      </div>
    </div>
  )
}
