import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BrewProvider } from './context/BrewContext'
import FeedPage from './pages/FeedPage'
import AddPage from './pages/AddPage'
import DetailPage from './pages/DetailPage'

export default function App() {
  return (
    <BrewProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/entry/:id" element={<DetailPage />} />
        </Routes>
      </BrowserRouter>
    </BrewProvider>
  )
}
