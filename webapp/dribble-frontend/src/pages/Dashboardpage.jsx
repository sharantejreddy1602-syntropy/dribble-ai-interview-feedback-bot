import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './Dashboardpage.module.css'
import { readThemePreference, writeThemePreference } from '../theme'
import ThemeSymbolPicker from '../components/ThemeSymbolPicker'
import useCursorGlow from '../hooks/useCursorGlow'

/* ══════════════════════════════════
   ICONS
══════════════════════════════════ */
function DribbleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="20" stroke="#c8c8c8" strokeWidth="2.4"/>
      <path d="M7 14 Q16 20 18 36" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      <path d="M3 24 Q14 18 38 26" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      <path d="M26 3 Q20 16 30 38" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

/* ══════════════════════════════════
   SESSION TIMER HOOK
══════════════════════════════════ */
function useTimer(seconds = 300) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    setLeft(seconds)
  }, [seconds])

  useEffect(() => {
    const id = setInterval(() => {
      setLeft(s => {
        if (s <= 1) { clearInterval(id); window.location.href = '/logout'; return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const status = left <= 60 ? 'critical' : left <= 120 ? 'expiring' : 'normal'
  return { display: fmt(left), status }
}

/* ══════════════════════════════════
   COUNT-UP HOOK
══════════════════════════════════ */
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      let start = 0
      const step = target / (duration / 16)
      const id = setInterval(() => {
        start = Math.min(start + step, target)
        setVal(Math.floor(start))
        if (start >= target) clearInterval(id)
      }, 16)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return { val, ref }
}

/* ══════════════════════════════════
   REVEAL HOOK
══════════════════════════════════ */
function useReveal(delay = 0) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); obs.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [delay])
  return { ref, visible }
}

/* ══════════════════════════════════
   NAVBAR
══════════════════════════════════ */
function Navbar({ username, role, scrolled, progress, theme, onSetTheme }) {
  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <a href="/" className={styles.navLogo}>
        <DribbleIcon className={styles.logoIcon} />
        <span className={styles.logoText}>Dribble</span>
      </a>

      <div className={styles.navLinks}>
        <a href="/dashboard" className={`${styles.navLink} ${styles.navLinkActive}`}>Dashboard</a>
        <Link to="/latency" className={styles.navLink}>Latency</Link>
        {role === 'admin' && <Link to="/admin" className={styles.navLink}>Admin</Link>}
      </div>

      <div className={styles.navRight}>
        <ThemeSymbolPicker theme={theme} onChange={onSetTheme} />
        <div className={styles.navUser}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span className={styles.navUsername}>{username}</span>
          <span className={styles.navRole}>{role}</span>
        </div>
        <a href="/logout" className={styles.navLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </a>
        <div className={styles.navProgress} style={{ width: `${progress}%` }} />
      </div>
    </nav>
  )
}

/* ══════════════════════════════════
   TOKEN BAR
══════════════════════════════════ */
function TokenBar({ token, display, status }) {
  const tokenPreview = token ? `${token.slice(0, 16)}…` : 'loading…'

  return (
    <div className={`${styles.tokenBar} ${styles[`tokenBar--${status}`]}`}>
      <div className={styles.tokenLeft}>
        <span className={styles.tokenDot} />
        <span className={styles.tokenLabel}>Session Active</span>
        <span className={styles.tokenVal}>{tokenPreview}</span>
      </div>
      <div className={styles.tokenRight}>
        <span className={styles.tokenWarn}>⚠ Expires in</span>
        <span className={styles.tokenTimer}>{display}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   STAT PILL
══════════════════════════════════ */
function StatPill({ target, label, delay = 0 }) {
  const { val, ref } = useCountUp(typeof target === 'number' ? target : 0)
  const display = typeof target === 'number' ? val : target
  return (
    <div className={styles.statPill} ref={ref}>
      <span className={styles.statNum}>{display}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

/* ══════════════════════════════════
   FLUENCY TAG
══════════════════════════════════ */
function FluencyTag({ label }) {
  const key = (label || '').toLowerCase().replace(/\s+/g, '-')
  return <span className={`${styles.fluencyTag} ${styles[`fluency--${key}`]}`}>{label}</span>
}

/* ══════════════════════════════════
   HISTORY CARD
══════════════════════════════════ */
function HistoryCard({ item, index }) {
  const { ref, visible } = useReveal(index * 80)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={ref}
      className={`${styles.historyCard} ${visible ? styles.historyCardVisible : ''} ${hovered ? styles.historyCardHovered : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.historyCardTop}>
        <span className={styles.historyCardCat}>{item.category}</span>
        <FluencyTag label={item.fluency_label} />
      </div>
      <p className={styles.historyCardQ}>{item.question}</p>
      <div className={styles.historyCardBottom}>
        <span className={styles.historyCardTime}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {item.timestamp}
        </span>
        <Link className={styles.historyCardView} to={`/report/${item.id}`}>
          View Report →
        </Link>
      </div>
      {/* Animated left accent */}
      <div className={styles.historyCardAccent} />
    </div>
  )
}

/* ══════════════════════════════════
   START INTERVIEW PANEL
══════════════════════════════════ */
function StartPanel() {
  const { ref, visible } = useReveal(100)
  const [pulse, setPulse] = useState(false)

  const handleHover = () => { setPulse(true); setTimeout(() => setPulse(false), 600) }

  return (
    <div ref={ref} className={`${styles.panel} ${styles.panelLeft} ${visible ? styles.panelVisible : ''}`}>

      {/* Decorative bg text */}
      <span className={styles.panelBgText} aria-hidden>AI</span>

      <p className={styles.panelEyebrow}>Ready to Practice?</p>
      <h2 className={styles.panelTitle}>
        Start Your<br/>
        <span>Interview</span>
      </h2>

      <p className={styles.panelDesc}>
        Answer 5 questions out loud. Dribble transcribes your audio, scores your fluency, and delivers structured AI feedback — in real time.
      </p>

      {/* Feature chips */}
      <div className={styles.featureChips}>
        {[
          { icon: '🎙️', text: 'Voice Recording' },
          { icon: '🧠', text: 'AI Analysis' },
          { icon: '📊', text: 'Fluency Score' },
          { icon: '⚡', text: 'Instant Feedback' },
        ].map(f => (
          <div key={f.text} className={styles.featureChip}>
            <span>{f.icon}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      <Link
        to="/interview"
        className={`${styles.btnStart} ${pulse ? styles.btnStartPulse : ''}`}
        onMouseEnter={handleHover}
      >
        <span className={styles.btnStartShimmer} />
        <span className={styles.btnStartIcon}>▶</span>
        <span className={styles.btnStartContent}>
          <span className={styles.btnStartText}>Start Interview</span>
          <span className={styles.btnStartSub}>5 questions · AI feedback</span>
        </span>
        <span className={styles.btnStartArrow}>→</span>
      </Link>

    </div>
  )
}

/* ══════════════════════════════════
   HISTORY PANEL
══════════════════════════════════ */
function HistoryPanel({ history, maxItems = 5, loading = false, error = '' }) {
  const { ref, visible } = useReveal(200)
  const recent = [...history].reverse().slice(0, maxItems)

  return (
    <div ref={ref} className={`${styles.panel} ${styles.panelRight} ${visible ? styles.panelVisible : ''}`}>

      <div className={styles.historyHeader}>
        <div>
          <p className={styles.panelEyebrow}>Recent Sessions</p>
          <h2 className={styles.panelTitle}>Your <span>History</span></h2>
        </div>
        <Link to="/history" className={styles.btnHistory}>
          See All
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="13" height="13">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Loading history...</p>
          <p className={styles.emptySub}>Fetching your recent sessions.</p>
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Unable to load history</p>
          <p className={styles.emptySub}>{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" width="40" height="40" opacity="0.3">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <p className={styles.emptyTitle}>No answers yet</p>
          <p className={styles.emptySub}>Complete your first interview to see results here.</p>
        </div>
      ) : (
        <div className={styles.historyList}>
          {recent.map((item, i) => (
            <HistoryCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

    </div>
  )
}

/* ══════════════════════════════════
   INTERACTIVE UTILITY STRIP
══════════════════════════════════ */
function UtilityStrip({ dailyGoal, onGoalChange, goalProgress, stylePreset, onPresetChange }) {
  const presets = [
    { key: 'balanced', label: 'Balanced', hint: 'Mixed pace and neutral question difficulty.' },
    { key: 'intense', label: 'Intense', hint: 'Fast rounds to train confidence under pressure.' },
    { key: 'reflective', label: 'Reflective', hint: 'Slower pace focused on clarity and structure.' },
  ]

  const activePreset = presets.find((preset) => preset.key === stylePreset) || presets[0]

  return (
    <section className={styles.utilityStrip}>
      <div className={styles.utilityCard}>
        <div className={styles.utilityHead}>
          <p className={styles.utilityLabel}>Daily Goal</p>
          <span className={styles.goalValue}>{dailyGoal} answers</span>
        </div>
        <input
          type="range"
          min="3"
          max="12"
          value={dailyGoal}
          onChange={(e) => onGoalChange(Number(e.target.value))}
          className={styles.goalSlider}
        />
        <div className={styles.goalTrack}>
          <span className={styles.goalFill} style={{ width: `${goalProgress}%` }} />
        </div>
      </div>

      <div className={styles.utilityCard}>
        <p className={styles.utilityLabel}>Practice Style</p>
        <div className={styles.presetChips}>
          {presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`${styles.presetChip} ${stylePreset === preset.key ? styles.presetChipActive : ''}`}
              onClick={() => onPresetChange(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className={styles.presetHint}>{activePreset.hint}</p>
      </div>
    </section>
  )
}

/* ══════════════════════════════════
   FLASH MESSAGE
══════════════════════════════════ */
function Flash({ messages }) {
  const [items, setItems] = useState(messages || [])
  const dismiss = i => setItems(prev => prev.filter((_, idx) => idx !== i))

  useEffect(() => {
    const t = setTimeout(() => setItems([]), 4500)
    return () => clearTimeout(t)
  }, [])

  return items.map((m, i) => (
    <div key={i} className={`${styles.flash} ${styles[`flash--${m.category}`]}`}>
      <span>{m.message}</span>
      <button className={styles.flashClose} onClick={() => dismiss(i)}>✕</button>
    </div>
  ))
}

/* ══════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════ */
export default function DashboardPage({
  username: initialUsername = 'user',
  role: initialRole = 'user',
  token: initialToken = '',
  history: initialHistory = [],
  messages = [],
}) {
  const { glowRef, dotRef } = useCursorGlow()
  const [currentUsername, setCurrentUsername] = useState(() => window.localStorage.getItem('username') || initialUsername)
  const [currentRole, setCurrentRole] = useState(initialRole)
  const [currentToken, setCurrentToken] = useState(initialToken)
  const [historyData, setHistoryData] = useState(initialHistory)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(300)

  const { display, status } = useTimer(secondsLeft)
  const [scrolled,  setScrolled]  = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [mounted,   setMounted]   = useState(false)
  const [theme, setTheme] = useState(() => readThemePreference('dashboard-theme'))
  const [dailyGoal, setDailyGoal] = useState(5)
  const [stylePreset, setStylePreset] = useState('balanced')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    writeThemePreference(theme, 'dashboard-theme')
  }, [theme])

  useEffect(() => {
    let active = true

    const loadHistory = async () => {
      try {
        setHistoryLoading(true)
        setHistoryError('')

        const response = await fetch('/api/history', {
          credentials: 'include',
        })

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          throw new Error('Server returned an invalid history response.')
        }

        if (!response.ok || !data.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error(data.error || 'Unable to load history.')
        }

        if (!active) return

        setCurrentUsername(data.username || initialUsername)
        setCurrentRole(data.role || initialRole)
        setCurrentToken(data.token || '')
        setHistoryData(Array.isArray(data.history) ? data.history : [])

        if (typeof data.seconds_left === 'number') {
          setSecondsLeft(Math.max(0, data.seconds_left))
        }

        if (data.username) {
          window.localStorage.setItem('username', data.username)
        }
      } catch (err) {
        if (!active) return
        setHistoryError(err.message || 'Unable to load history.')
        setHistoryData(Array.isArray(initialHistory) ? initialHistory : [])
      } finally {
        if (active) {
          setHistoryLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fluent = historyData.filter(h => h.fluency_label === 'Fluent').length
  const goalProgress = Math.min((historyData.length / dailyGoal) * 100, 100)

  return (
    <div className={`${styles.page} ${mounted ? styles.pageMounted : ''} ${theme === 'light' ? styles.pageLight : ''}`}>

      {/* Cursor */}
      <div ref={glowRef} className={styles.cursorGlow} />
      <div ref={dotRef}  className={styles.cursorDot}  />

      {/* Noise texture */}
      <div className={styles.noise} aria-hidden />

      {/* Flash */}
      <Flash messages={messages} />

      {/* Navbar */}
      <Navbar
        username={currentUsername}
        role={currentRole}
        scrolled={scrolled}
        progress={progress}
        theme={theme}
        onSetTheme={setTheme}
      />

      {/* Token bar */}
      <TokenBar token={currentToken} display={display} status={status} />

      <main className={styles.main}>

        {/* ── WELCOME STRIP ── */}
        <section className={styles.welcomeStrip}>
          <div className={styles.welcomeLeft}>
            <p className={styles.welcomeEyebrow}>Welcome back</p>
            <h1 className={styles.welcomeName}>
              {currentUsername}<span className={styles.welcomeDot}>.</span>
            </h1>
          </div>
          <div className={styles.welcomeRight}>
            <StatPill target={historyData.length} label="Total Answers" />
            <div className={styles.statDivider} />
            <StatPill target={fluent} label="Fluent" />
            <div className={styles.statDivider} />
            <StatPill target={4} label="Categories" />
          </div>
        </section>

        <UtilityStrip
          dailyGoal={dailyGoal}
          onGoalChange={setDailyGoal}
          goalProgress={goalProgress}
          stylePreset={stylePreset}
          onPresetChange={setStylePreset}
        />

        {/* ── GRID ── */}
        <div className={styles.grid}>
          <StartPanel />
          <HistoryPanel history={historyData} maxItems={5} loading={historyLoading} error={historyError} />
        </div>

      </main>

      <footer className={styles.footer}>
        <p>Dribble</p>
      </footer>

    </div>
  )
}