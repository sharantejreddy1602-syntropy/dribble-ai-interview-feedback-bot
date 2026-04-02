import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Adminpage.module.css'
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
  return entry.id || `${entry.username || 'user'}-${entry.timestamp || 'entry'}-${index}`
}

export default function Adminpage() {
  const { glowRef } = useCursorGlow()
  const navigate = useNavigate()

  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState(() => readThemePreference('admin-theme'))
  const [username, setUsername] = useState(() => window.localStorage.getItem('username') || 'admin')
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    writeThemePreference(theme, 'admin-theme')
  }, [theme])

  useEffect(() => {
    let active = true

    const loadAdminHistory = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/admin/history', {
          credentials: 'include',
        })

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          throw new Error('Server returned an invalid admin history response.')
        }

        if (!response.ok || !data.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }

          if (response.status === 403) {
            window.location.href = '/dashboard'
            return
          }

          throw new Error(data.error || 'Unable to load admin history.')
        }

        if (!active) return

        const incomingHistory = Array.isArray(data.history) ? data.history : []
        setHistory(incomingHistory)
        setStats(data.stats || {})
        setUsername(data.username || 'admin')

        if (data.username) {
          window.localStorage.setItem('username', data.username)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load admin history.')
        setHistory([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadAdminHistory()

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
      const userText = String(entry.username || '').toLowerCase()
      const questionText = String(entry.question || '').toLowerCase()
      const categoryOk = activeFilter === 'all' || category.toLowerCase() === activeFilter.toLowerCase()
      const queryOk = !query || userText.includes(query) || questionText.includes(query)
      return categoryOk && queryOk
    })
  }, [numberedRows, activeFilter, searchQuery])

  const total = Number(stats.total ?? history.length)
  const uniqueUsers = Number(
    stats.unique_users ?? new Set(history.map((item) => item.username).filter(Boolean)).size,
  )
  const fluent = Number(
    stats.fluent
      ?? history.filter((item) => String(item.fluency_label || '').toLowerCase() === 'fluent').length,
  )
  const needsWork = Number(stats.needs_work ?? Math.max(total - fluent, 0))

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
          <Link to="/interview" className={styles.navLink}>Interview</Link>
          <Link to="/latency" className={styles.navLink}>Latency</Link>
          <Link to="/admin" className={`${styles.navLink} ${styles.navLinkActive}`}>Admin</Link>
        </div>

        <div className={styles.navRight}>
          <ThemeSymbolPicker theme={theme} onChange={setTheme} />
          <div className={`${styles.navUser} ${styles.navUserAdmin}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>{username} <em>admin</em></span>
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
          <p className={styles.pageHeaderEyebrow}>Admin Panel</p>
          <h1 className={styles.pageHeaderTitle}>
            All User <span>Sessions</span>
          </h1>
          <p className={styles.pageHeaderSub}>
            Complete history of every interview session across all users. Full access to transcripts, metrics, and AI feedback.
          </p>

          <div className={styles.statsStrip}>
            <div className={styles.statPill}>
              <span className={styles.statNum}>{total}</span>
              <span className={styles.statLabel}>Total Sessions</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statPill}>
              <span className={styles.statNum}>{uniqueUsers}</span>
              <span className={styles.statLabel}>Unique Users</span>
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
                placeholder="Search by user or question..."
                autoComplete="off"
              />
            </div>
          </section>
        )}

        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Loading sessions...</p>
            <p className={styles.emptySub}>Fetching all interview sessions.</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Unable to load sessions</p>
            <p className={styles.emptySub}>{error}</p>
          </div>
        ) : showEmpty ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎙️</div>
            <p className={styles.emptyTitle}>No sessions yet</p>
            <p className={styles.emptySub}>No users have completed an interview session yet.</p>
          </div>
        ) : (
          <>
            <section className={styles.historyWrap}>
              <div className={styles.historyHeader}>
                <span className={styles.colNum}>#</span>
                <span className={styles.colUser}>User</span>
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
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <span className={styles.colNum}>{entry._rowNumber}</span>

                  <span className={styles.colUser}>
                    <span className={styles.userBadge}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="11" height="11">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                      {entry.username || 'unknown'}
                    </span>
                  </span>

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
                      View
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
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
