import { useAuth } from '../context/AuthContext'

export default function DemoBanner() {
  const { exitDemo } = useAuth()

  return (
    <button
      type="button"
      onClick={exitDemo}
      aria-label="Exit demo mode and sign in"
      style={{
        display: 'block',
        minHeight: 44,
        margin: '0 auto 16px',
        padding: '8px 14px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface)',
        color: 'var(--text-secondary)',
        fontSize: 12,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
      }}
    >
      🧪 Demo mode · Sign in
    </button>
  )
}
