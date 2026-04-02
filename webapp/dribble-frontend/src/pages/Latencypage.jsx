import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Latencypage.css'
import { readThemePreference, writeThemePreference } from '../theme'
import ThemeSymbolPicker from '../components/ThemeSymbolPicker'
import useCursorGlow from '../hooks/useCursorGlow'

function DribbleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="20" stroke="#c8c8c8" strokeWidth="2.4" />
      <path d="M7 14 Q16 20 18 36" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M3 24 Q14 18 38 26" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M26 3 Q20 16 30 38" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function fmtSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Latencypage() {
  const navigate = useNavigate()
  const { glowRef } = useCursorGlow()
  const fileInputRef = useRef(null)

  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState(() => readThemePreference('latency-theme'))
  const [username, setUsername] = useState(() => window.localStorage.getItem('username') || 'user')
  const [role, setRole] = useState('user')
  const [token, setToken] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    writeThemePreference(theme, 'latency-theme')
  }, [theme])

  useEffect(() => {
    let active = true

    const loadSession = async () => {
      try {
        const response = await fetch('/api/history', {
          credentials: 'include',
        })

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          throw new Error('Unable to parse session data.')
        }

        if (!response.ok || !data.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error(data.error || 'Unable to load session data.')
        }

        if (!active) return

        setUsername(data.username || 'user')
        setRole(data.role || 'user')
        setToken(data.token || '')

        if (data.username) {
          window.localStorage.setItem('username', data.username)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load session data.')
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  const setFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    setError('')
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onInputChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (file) setFile(file)
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) setFile(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedFile || running) return

    setRunning(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('audio', selectedFile)

      const response = await fetch('/api/latency/benchmark', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const raw = await response.text()
      let data = {}

      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        throw new Error('Server returned an invalid benchmark response.')
      }

      if (!response.ok || !data.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(data.error || 'Unable to run latency benchmark.')
      }

      if (data.username) {
        setUsername(data.username)
        window.localStorage.setItem('username', data.username)
      }

      if (data.role) setRole(data.role)
      if (data.token) setToken(data.token)

      navigate(data.redirect || '/latency_result')
    } catch (err) {
      setError(err.message || 'Unable to run benchmark right now.')
      setRunning(false)
    }
  }

  const buttonLabel = running
    ? 'Running 10 benchmark runs... please wait'
    : selectedFile
      ? 'Run Benchmark (10 Runs)'
      : 'Select a file to run benchmark'

  return (
    <div className={`latency-page ${theme === 'light' ? 'latency-page--light' : ''} ${mounted ? 'latency-page--mounted' : ''}`}>
      <div ref={glowRef} className="cursor-glow" />

      <nav>
        <Link to="/" className="nav__logo">
          <DribbleIcon className="logo__icon" />
          <span className="logo__text">Dribble</span>
        </Link>

        <div className="nav__links">
          <Link to="/dashboard" className="nav__link">Dashboard</Link>
          <Link to="/interview" className="nav__link">Interview</Link>
          <Link to="/latency" className="nav__link nav__link--active">Latency</Link>
          {role === 'admin' && <Link to="/admin" className="nav__link">Admin</Link>}
        </div>

        <div className="nav__right">
          <ThemeSymbolPicker theme={theme} onChange={setTheme} />
          <div className="nav__user">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>{username}</span>
          </div>
          <a href="/logout" className="nav__logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </a>
        </div>
      </nav>

      <main>
        <div className="page-header">
          <p className="page-header__eyebrow">System Diagnostics</p>
          <h1 className="page-header__title">Latency <span>Benchmark</span></h1>
          <p className="page-header__sub">
            Upload an audio file to benchmark the full inference pipeline across 10 consecutive runs.
            Measures Whisper transcription, feature extraction, and ML prediction independently.
          </p>
        </div>

        <div className="info-strip">
          <div className="info-tile">
            <span className="info-tile__icon">🎙️</span>
            <div>
              <div className="info-tile__title">Whisper ASR</div>
              <div className="info-tile__sub">Speech-to-text latency</div>
            </div>
          </div>
          <div className="info-tile">
            <span className="info-tile__icon">⚙️</span>
            <div>
              <div className="info-tile__title">Feature Extraction</div>
              <div className="info-tile__sub">NLP + audio features</div>
            </div>
          </div>
          <div className="info-tile">
            <span className="info-tile__icon">📊</span>
            <div>
              <div className="info-tile__title">ML Prediction</div>
              <div className="info-tile__sub">RandomForest fluency model</div>
            </div>
          </div>
          <div className="info-tile info-tile--note">
            <span className="info-tile__icon">⚡</span>
            <div>
              <div className="info-tile__title">10 Runs</div>
              <div className="info-tile__sub">Avg · Min · Max reported</div>
            </div>
          </div>
        </div>

        <div className="upload-card">
          <div className="upload-card__hdr">
            <span className="upload-card__label">Upload Audio File</span>
            <span className="upload-card__note">LLM excluded to prevent quota exhaustion</span>
          </div>

          <form onSubmit={handleSubmit} id="benchForm">
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
              id="dropZone"
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" width="36" height="36" className="drop-zone__icon">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              <p className="drop-zone__text" id="dropText">
                Drag and drop your audio file here
                <br />
                <span>or click to browse</span>
              </p>
              <p className="drop-zone__formats">.mp3 · .wav · .m4a · .mp4</p>
              <input
                ref={fileInputRef}
                type="file"
                name="audio"
                id="audioFile"
                accept=".mp4,.wav,.mp3,.m4a"
                onChange={onInputChange}
                required={!selectedFile}
              />
            </div>

            {selectedFile && (
              <div className="file-preview" id="filePreview">
                <span className="file-preview__icon">🎵</span>
                <div className="file-preview__info">
                  <span className="file-preview__name" id="fileName">{selectedFile.name}</span>
                  <span className="file-preview__size" id="fileSize">{fmtSize(selectedFile.size)}</span>
                </div>
                <button type="button" className="file-preview__remove" id="removeFile" onClick={clearFile}>✕</button>
              </div>
            )}

            <button type="submit" className={`btn-run ${running ? 'running' : ''}`} id="btnRun" disabled={!selectedFile || running}>
              <span id="btnRunText">{buttonLabel}</span>
              {running ? (
                <span className="btn-run__loader" aria-hidden="true">
                  <span className="btn-run__loader-ring" />
                  <span className="btn-run__loader-ring btn-run__loader-ring--inner" />
                </span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            {error && <p className="latency-error">{error}</p>}
          </form>
        </div>

        <div className="session-bar">
          <span className="session-bar__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="12" height="12">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Token: <strong>{token || 'loading...'}</strong>
          </span>
          <span className="session-bar__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="12" height="12">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Session expires in <strong>5 minutes</strong>
          </span>
        </div>
      </main>

      <footer>
        <p>Dribble</p>
      </footer>
    </div>
  )
}
