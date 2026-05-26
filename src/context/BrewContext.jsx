import { createContext, useContext, useEffect, useReducer } from 'react'

const BrewContext = createContext(null)

const STORAGE_KEY = 'brew-entries'

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [action.entry, ...state]
    case 'DELETE':
      return state.filter(e => e.id !== action.id)
    default:
      return state
  }
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

  return (
    <BrewContext.Provider value={{ entries, addEntry, deleteEntry }}>
      {children}
    </BrewContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrew() {
  return useContext(BrewContext)
}
