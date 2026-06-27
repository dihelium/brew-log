import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BrewProvider } from './context/BrewContext'
import FeedPage from './pages/FeedPage'
import AddPage from './pages/AddPage'
import DetailPage from './pages/DetailPage'
import LoginPage from './pages/LoginPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<FeedPage />} />
        <Route path="/add" element={
          <>
            <FeedPage />
            <AddPage />
          </>
        } />
        <Route path="/entry/:id" element={<DetailPage />} />
      </Routes>
    </AnimatePresence>
  )
}

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="feed-page" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        ☕
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <BrewProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </BrewProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
