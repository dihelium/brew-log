import { createContext, useContext, useEffect, useReducer } from 'react'

const BrewContext = createContext(null)

const STORAGE_KEY = 'brew-entries'

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [action.entry, ...state]
    case 'DELETE':
      return state.filter(e => e.id !== action.id)
    case 'IMPORT': {
      // Merge incoming with existing, deduped by id, newest first.
      // Existing entries always survive — import only fills in gaps.
      const byId = new Map()
      for (const e of [...action.entries, ...state]) {
        if (!byId.has(e.id)) byId.set(e.id, e)
      }
      return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp)
    }
    default:
      return state
  }
}

function isValidEntry(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.timestamp === 'number'
  )
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function BrewProvider({ children }) {
  const [entries, dispatch] = useReducer(reducer, null, loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // localStorage full — silently ignore
    }
  }, [entries])

  function addEntry({ type, name, photo, rating, notes, color }) {
    dispatch({
      type: 'ADD',
      entry: {
        id: crypto.randomUUID(),
        type,
        name,
        timestamp: Date.now(),
        ...(photo != null && { photo }),
        ...(rating != null && { rating }),
        ...(notes != null && { notes }),
        ...(color != null && { color }),
      },
    })
  }

  function deleteEntry(id) {
    dispatch({ type: 'DELETE', id })
  }

  // Merge a parsed backup into the current entries. Returns counts so the
  // UI can report what happened. Never removes existing entries.
  function importEntries(raw) {
    const list = Array.isArray(raw) ? raw : []
    const valid = list.filter(isValidEntry)
    const existingIds = new Set(entries.map(e => e.id))
    const added = valid.filter(e => !existingIds.has(e.id)).length
    dispatch({ type: 'IMPORT', entries: valid })
    return { total: list.length, valid: valid.length, added }
  }

  return (
    <BrewContext.Provider value={{ entries, addEntry, deleteEntry, importEntries }}>
      {children}
    </BrewContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrew() {
  return useContext(BrewContext)
}
