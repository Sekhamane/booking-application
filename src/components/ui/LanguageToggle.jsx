import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'EN'     },
  { code: 'si', label: 'සිං'    },
  { code: 'ta', label: 'தமிழ்' },
]

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const active = i18n.language?.split('-')[0]

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.7rem',
            fontWeight: 400,
            letterSpacing: '0.06em',
            padding: '4px 9px',
            borderRadius: 2,
            border: '1px solid',
            borderColor: active === l.code ? 'var(--accent-soft)' : 'var(--line-strong)',
            background: active === l.code ? 'rgba(217,180,131,0.15)' : 'transparent',
            color: active === l.code ? 'var(--accent-soft)' : 'var(--gold)',
            cursor: 'pointer',
            transition: 'all 0.3s var(--ease)',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
