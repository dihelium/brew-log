import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState('')

  async function handleSignIn() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e?.message || 'Sign-in failed. Please try again.')
    }
  }

  return (
    <div className="feed-page" style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>☕</div>
      <h1 className="feed-page__heading" style={{ margin: 0 }}>my brew log</h1>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14, maxWidth: 260 }}>
        Sign in to sync your brews across devices.
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        style={{
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
        }}
      >
        Continue with Google
      </button>
      {error && (
        <p style={{ color: 'var(--accent-coffee)', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
