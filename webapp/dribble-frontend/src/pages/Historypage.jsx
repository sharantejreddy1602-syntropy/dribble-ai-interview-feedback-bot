import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Historypage.module.css'
import { readThemePreference, writeThemePreference } from '../theme'
import ThemeSymbolPicker from '../components/ThemeSymbolPicker'
import useCursorGlow from '../hooks/useCursorGlow'

const FILTERS = ['all', 'HR', 'Technical', 'Behavioral', 'Aptitude']

const CATEGORY_CLASS_MAP = {
  hr: 'catHr',
  technical: 'catTechnical',
  behavioral: 'catBehavioral',
  aptitude: 'catAptitude',
}

const FLUENCY_CLASS_MAP = {
  fluent: 'fluencyFluent',
  'non-fluent': 'fluencyNonFluent',
  'non fluent': 'fluencyNonFluent',
  moderate: 'fluencyModerate',
  good: 'fluencyFluent',
  average: 'fluencyModerate',
  poor: 'fluencyNonFluent',
  disfluent: 'fluencyNonFluent',
}

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

function getCategoryClass(category) {
  const key = String(category || '').toLowerCase()
  return styles[CATEGORY_CLASS_MAP[key]] || ''
}

function getFluencyClass(label) {
  const key = String(label || '').toLowerCase().trim()
  return styles[FLUENCY_CLASS_MAP[key]] || ''
}

function toKey(entry, index) {
  return entry.id || `${entry.timestamp || 'entry'}-${index}`
}

export default function Historypage() {
  const { glowRef } = useCursorGlow()
  const navigate = useNavigate()

  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState(() => readThemePreference('history-theme'))
  const [username, setUsername] = useState(() => window.localStorage.getItem('username') || 'user')
  const [role, setRole] = useState('user')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    writeThemePreference(theme, 'history-theme')
  }, [theme])

  useEffect(() => {
    let active = true

    const loadHistory = async () => {
      try {
        setLoading(true)
        setError('')

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

        const incomingHistory = Array.isArray(data.history) ? data.history : []
        setHistory(incomingHistory)
        setUsername(data.username || 'user')
        setRole(data.role || 'user')

        if (data.username) {
          window.localStorage.setItem('username', data.username)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load history.')
        setHistory([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [])

  const reversedHistory = useMemo(() => {
    return [...history].reverse()
  }, [history])

  const numberedRows = useMemo(() => {
    return reversedHistory.map((entry, index) => ({
      ...entry,
      _rowNumber: history.length - index,
    }))
  }, [reversedHistory, history.length])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return numberedRows.filter((entry) => {
      const category = String(entry.category || '')
      const question = String(entry.question || '').toLowerCase()
      const categoryOk = activeFilter === 'all' || category.toLowerCase() === activeFilter.toLowerCase()
      const queryOk = !query || question.includes(query)
      return categoryOk && queryOk
    })
  }, [numberedRows, activeFilter, searchQuery])

  const total = history.length
  const fluent = history.filter((item) => String(item.fluency_label || '').toLowerCase() === 'fluent').length
  const needsWork = total - fluent
  const categories = new Set(history.map((item) => item.category).filter(Boolean)).size

  const showEmpty = !loading && !error && history.length === 0
  const showNoFilterMatch = !loading && !error && history.length > 0 && filteredRows.length === 0

  const openReport = (id) => {
    if (!id) return
    navigate(`/report/${id}`)
  }

  return (
    <div className={`${styles.page} ${theme === 'light' ? styles.pageLight : ''} ${mounted ? styles.pageMounted : ''}`}>
      <div ref={glowRef} className={styles.cursorGlow} />

      <nav className={styles.nav}>
        <Link to="/" className={styles.navLogo}>
          <DribbleIcon className={styles.logoIcon} />
          <span className={styles.logoText}>Dribble</span>
        </Link>

        <div className={styles.navLinks}>
          <Link to="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link to="/interview" className={styles.navLink}>New Interview</Link>
          <Link to="/latency" className={styles.navLink}>Latency</Link>
          {role === 'admin' && <Link to="/admin" className={styles.navLink}>Admin</Link>}
        </div>

        <div className={styles.navRight}>
          <ThemeSymbolPicker theme={theme} onChange={setTheme} />
          <div className={styles.navUser}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>{username}</span>
          </div>
          <a href="/logout" className={styles.navLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </a>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <p className={styles.pageHeaderEyebrow}>Full History</p>
          <h1 className={styles.pageHeaderTitle}>
            Your <span>Sessions</span>
          </h1>
          <p className={styles.pageHeaderSub}>
            Every interview practice session in one place. Click any entry to view the full feedback report.
          </p>

          <div className={styles.statsStrip}>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{total}</span>
              <span className={styles.statLabel}>Total Sessions</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statPill}>
              <span className={`${styles.statNum} ${styles.statNumGreen}`}>{fluent}</span>
              <span className={styles.statLabel}>Fluent</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statPill}>
              <span className={`${styles.statNum} ${styles.statNumRed}`}>{needsWork}</span>
              <span className={styles.statLabel}>Needs Work</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statPill}>
              <span className={styles.statNum}>{categories}</span>
              <span className={styles.statLabel}>Categories</span>
            </div>
          </div>
        </header>

        {!showEmpty && (
          <section className={styles.filterBar}>
            <div className={styles.filterLeft}>
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterBtnActive : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter}
                </button>
              ))}
            </div>

            <div className={styles.searchBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="14" height="14">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search questions..."
                autoComplete="off"
              />
            </div>
          </section>
        )}

        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Loading history...</p>
            <p className={styles.emptySub}>Fetching your interview sessions.</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Unable to load history</p>
            <p className={styles.emptySub}>{error}</p>
          </div>
        ) : showEmpty ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎙️</div>
            <p className={styles.emptyTitle}>No sessions yet</p>
            <p className={styles.emptySub}>Complete your first interview to see your history here.</p>
            <Link to="/interview" className={`${styles.btnPrimary} ${styles.emptyPrimary}`}>
              Start Interview →
            </Link>
          </div>
        ) : (
          <>
            <section className={styles.historyWrap}>
              <div className={styles.historyHeader}>
                <span className={styles.colNum}>#</span>
                <span className={styles.colCat}>Category</span>
                <span className={styles.colQuestion}>Question</span>
                <span className={styles.colLabel}>Fluency</span>
                <span className={styles.colTime}>Timestamp</span>
                <span className={styles.colAction}></span>
              </div>

              {filteredRows.map((entry, index) => (
                <div
                  key={toKey(entry, index)}
                  className={styles.historyRow}
                  onClick={(event) => {
                    if (event.target.closest('a')) return
                    openReport(entry.id)
                  }}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <span className={styles.colNum}>{entry._rowNumber}</span>

                  <span className={styles.colCat}>
                    <span className={`${styles.catBadge} ${getCategoryClass(entry.category)}`}>
                      {entry.category || 'Unknown'}
                    </span>
                  </span>

                  <span className={styles.colQuestion} title={entry.question || ''}>
                    {entry.question || 'No question saved'}
                  </span>

                  <span className={styles.colLabel}>
                    <span className={`${styles.fluencyBadge} ${getFluencyClass(entry.fluency_label)}`}>
                      {entry.fluency_label || 'Unknown'}
                    </span>
                  </span>

                  <span className={styles.colTime}>{entry.timestamp || '-'}</span>

                  <span className={styles.colAction}>
                    <Link to={`/report/${entry.id}`} className={styles.btnView}>
                      View Report
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="13" height="13">
                        <path d="M5 12h14" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  </span>
                </div>
              ))}
            </section>

            {showNoFilterMatch && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔍</div>
                <p className={styles.emptyTitle}>No matching sessions</p>
                <p className={styles.emptySub}>Try a different category or search term.</p>
              </div>
            )}

            <div className={styles.actionBar}>
              <Link to="/dashboard" className={styles.btnGhost}>← Dashboard</Link>
              <Link to="/interview" className={styles.btnPrimary}>New Interview →</Link>
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Dribble</p>
      </footer>
    </div>
  )
}
