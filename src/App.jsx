import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { BrewProvider } from './context/BrewContext'
import FeedPage from './pages/FeedPage'
import AddPage from './pages/AddPage'
import DetailPage from './pages/DetailPage'

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

export default function App() {
  return (
    <BrewProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </BrewProvider>
  )
}
