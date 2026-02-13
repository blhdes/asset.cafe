import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import LandingPage from './pages/LandingPage'

const VaultPage = lazy(() => import('./pages/VaultPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/vault/:hash" element={<VaultPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
