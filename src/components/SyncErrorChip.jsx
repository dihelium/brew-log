import { useBrew } from '../context/BrewContext'

export default function SyncErrorChip() {
  const { retrySync } = useBrew()

  return (
    <button
      type="button"
      onClick={retrySync}
      aria-label="Sync failed — tap to retry"
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
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ⚠️ Sync failed — tap to retry
    </button>
  )
}
