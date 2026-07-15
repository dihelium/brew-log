import { useRef, useState } from 'react'
import { useBrew } from '../context/BrewContext'
import { useAuth } from '../context/AuthContext'

const btnStyle = {
  flex: 1,
  padding: '10px 12px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
}

export default function BackupControls() {
  const { entries, importEntries, exportEntries } = useBrew()
  const { user, signOut } = useAuth()
  const fileRef = useRef(null)
  const [status, setStatus] = useState('')

  async function handleExport() {
    const data = await exportEntries()
    const json = JSON.stringify(data, null, 2)
    const filename = `brew-log-backup-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([json], filename, { type: 'application/json' })

    // Prefer the native share sheet — on iOS this lets you save to Files,
    // Notes, or AirDrop, which survives re-adding the home-screen app.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'brew log backup' })
        setStatus(`Exported ${entries.length} ${entries.length === 1 ? 'brew' : 'brews'}.`)
        return
      } catch (err) {
        if (err && err.name === 'AbortError') return // user cancelled — do nothing
        // otherwise fall through to download
      }
    }

    // Fallback: download the file directly.
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setStatus(`Saved ${filename}`)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file later
    if (!file) return
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const { added, valid } = await importEntries(raw)
      if (valid === 0) {
        setStatus('No valid brews found in that file.')
      } else if (added === 0) {
        setStatus('Already up to date — nothing new to add.')
      } else {
        setStatus(`Restored ${added} ${added === 1 ? 'brew' : 'brews'}.`)
      }
    } catch {
      setStatus("Couldn't read that file — is it a brew-log backup?")
    }
  }

  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        marginBottom: 10,
        textAlign: 'center',
      }}>
        Backup
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          style={{ ...btnStyle, opacity: entries.length === 0 ? 0.45 : 1 }}
          disabled={entries.length === 0}
          onClick={handleExport}
        >
          Export
        </button>
        <button
          type="button"
          style={btnStyle}
          onClick={() => fileRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>

      {status && (
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          marginTop: 10,
          textAlign: 'center',
        }}>
          {status}
        </p>
      )}

      {user && !user.isDemo && (
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          marginTop: 16,
          textAlign: 'center',
        }}>
          Signed in as {user.email}
        </p>
      )}

      <button
        type="button"
        onClick={signOut}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '10px 12px',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  )
}
