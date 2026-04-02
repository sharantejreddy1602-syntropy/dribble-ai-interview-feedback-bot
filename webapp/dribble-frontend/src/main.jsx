import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './styles/global.css'
import LandingPage from './pages/LandingPage'
import LoginPage    from './pages/Loginpage'
import DashboardPage from './pages/Dashboardpage'
import InterviewPage from './pages/Interviewpage'
import Historypage from './pages/Historypage'
import Reportpage from './pages/Reportpage'
import Adminpage from './pages/Adminpage'
import Latencypage from './pages/Latencypage'
import LatencyResultpage from './pages/LatencyResultpage'
import KnowMorePage from './pages/KnowMorePage'

const EXIT_MS = 160

function AnimatedRoutes() {
  const location = useLocation()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const [phase, setPhase] = useState('enter')

  const locationSig = `${location.pathname}${location.search}${location.hash}`
  const displayedSig = `${displayedLocation.pathname}${displayedLocation.search}${displayedLocation.hash}`

  useEffect(() => {
    if (locationSig === displayedSig) return
    setPhase('exit')
  }, [locationSig, displayedSig])

  useEffect(() => {
    if (phase !== 'exit') return

    const timer = window.setTimeout(() => {
      setDisplayedLocation(location)
      setPhase('enter')
    }, EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [phase, location])

  return (
    <div className={`route-transition ${phase === 'exit' ? 'route-transition--exit' : 'route-transition--enter'}`}>
      <Routes location={displayedLocation}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/history" element={<Historypage />} />
        <Route path="/latency" element={<Latencypage />} />
        <Route path="/latency_result" element={<LatencyResultpage />} />
        <Route path="/knowmore" element={<KnowMorePage />} />
        <Route path="/report/:resultId" element={<Reportpage />} />
        <Route path="/admin" element={<Adminpage />} />
      </Routes>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </StrictMode>
)