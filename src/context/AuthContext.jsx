import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const DEMO_USER = { id: 'demo', email: 'demo@brew.log', isDemo: true }
const DEMO_STORAGE_KEY = 'brewlog:demo'

export function AuthProvider({ children }) {
  const [realUser, setRealUser] = useState(null)
  const [isDemo, setIsDemo] = useState(() => localStorage.getItem(DEMO_STORAGE_KEY) === '1')
  const [loading, setLoading] = useState(true)

  function clearDemoFlag() {
    setIsDemo(false)
    localStorage.removeItem(DEMO_STORAGE_KEY)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null
      setRealUser(nextUser)
      if (nextUser) clearDemoFlag()
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setRealUser(nextUser)
      if (nextUser) clearDemoFlag()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  function enterDemo() {
    setIsDemo(true)
    localStorage.setItem(DEMO_STORAGE_KEY, '1')
  }

  function exitDemo() {
    setIsDemo(false)
    localStorage.removeItem(DEMO_STORAGE_KEY)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    const hadRealSession = !!realUser
    exitDemo()
    if (!hadRealSession) return
    await supabase.auth.signOut()
  }

  const user = realUser ?? (isDemo ? DEMO_USER : null)

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isDemo,
      enterDemo,
      exitDemo,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
