import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { ThemeProvider } from './contexts/ThemeContext'
import LandingPage from './pages/LandingPage'

const VaultPage = lazy(() => import('./pages/VaultPage'))
const SharedVaultPage = lazy(() => import('./pages/SharedVaultPage'))

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/vault/:hash" element={<VaultPage />} />
            <Route path="/shared/:shareHash" element={<SharedVaultPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}
