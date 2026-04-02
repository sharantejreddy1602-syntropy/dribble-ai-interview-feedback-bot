import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './LatencyResultpage.css'
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

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function fluencyClass(label) {
  const key = String(label || '').toLowerCase().replace(/\s+/g, '-')
  if (key === 'fluent' || key === 'good') return 'fluency-val--fluent'
  if (key === 'moderate' || key === 'average') return 'fluency-val--moderate'
  return 'fluency-val--non-fluent'
}

export default function LatencyResultpage() {
  const { glowRef } = useCursorGlow()
  const summaryTableRef = useRef(null)

  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState(() => readThemePreference('latency-result-theme'))
  const [username, setUsername] = useState(() => window.localStorage.getItem('username') || 'user')
  const [role, setRole] = useState('user')
  const [latencyResult, setLatencyResult] = useState(null)
  const [pdfFile, setPdfFile] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [barsVisible, setBarsVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    writeThemePreference(theme, 'latency-result-theme')
  }, [theme])

  useEffect(() => {
    let active = true

    const loadLatencyResult = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/latency/result', {
          credentials: 'include',
        })

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          throw new Error('Server returned an invalid latency result response.')
        }

        if (!response.ok || !data.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error(data.error || 'Unable to load benchmark results.')
        }

        if (!active) return

        setLatencyResult(data.latency_result || null)
        setPdfFile(data.pdf_file || '')
        setUsername(data.username || 'user')
        setRole(data.role || 'user')

        if (data.username) {
          window.localStorage.setItem('username', data.username)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load benchmark results.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadLatencyResult()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!summaryTableRef.current) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        setBarsVisible(true)
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.15 })

    observer.observe(summaryTableRef.current)

    return () => observer.disconnect()
  }, [latencyResult])

  const stages = useMemo(() => [
    { key: 'whisper', icon: '🎙️', label: 'Whisper ASR', desc: 'Speech-to-text transcription' },
    { key: 'feature', icon: '⚙️', label: 'Feature Extraction', desc: 'NLP + audio features' },
    { key: 'ml', icon: '📊', label: 'ML Prediction', desc: 'RandomForest fluency model' },
    { key: 'total', icon: '⏱️', label: 'Total Pipeline', desc: 'End-to-end (excl. LLM)' },
  ], [])

  const rows = useMemo(() => {
    if (!latencyResult) return []

    return [
      { icon: '🎙️', name: 'Whisper ASR', key: 'whisper' },
      { icon: '⚙️', name: 'Feature Extraction', key: 'feature' },
      { icon: '📊', name: 'ML Prediction', key: 'ml' },
      { icon: '⏱️', name: 'Total Pipeline', key: 'total' },
    ].map((row) => {
      const avg = toNumber(latencyResult[`${row.key}_avg_sec`])
      const min = toNumber(latencyResult[`${row.key}_min_sec`])
      const max = toNumber(latencyResult[`${row.key}_max_sec`])
      return {
        ...row,
        avg,
        min,
        max,
        spread: Number((max - min).toFixed(4)),
      }
    })
  }, [latencyResult])

  const perRunRows = useMemo(() => {
    if (!latencyResult) return []

    const runs = Number(latencyResult.runs || 0)
    const whisper = Array.isArray(latencyResult.whisper_latencies_sec) ? latencyResult.whisper_latencies_sec : []
    const feature = Array.isArray(latencyResult.feature_latencies_sec) ? latencyResult.feature_latencies_sec : []
    const ml = Array.isArray(latencyResult.ml_latencies_sec) ? latencyResult.ml_latencies_sec : []
    const total = Array.isArray(latencyResult.total_latencies_sec) ? latencyResult.total_latencies_sec : []
    const totalAvg = toNumber(latencyResult.total_avg_sec)

    return Array.from({ length: runs }, (_, index) => {
      const totalVal = toNumber(total[index])
      const diff = Number((totalVal - totalAvg).toFixed(2))
      return {
        run: index + 1,
        whisper: toNumber(whisper[index]),
        feature: toNumber(feature[index]),
        ml: toNumber(ml[index]),
        total: totalVal,
        diff,
      }
    })
  }, [latencyResult])

  const fastestRun = useMemo(() => {
    if (!perRunRows.length) return -1
    let idx = 0
    perRunRows.forEach((row, index) => {
      if (row.total < perRunRows[idx].total) idx = index
    })
    return idx
  }, [perRunRows])

  const slowestRun = useMemo(() => {
    if (!perRunRows.length) return -1
    let idx = 0
    perRunRows.forEach((row, index) => {
      if (row.total > perRunRows[idx].total) idx = index
    })
    return idx
  }, [perRunRows])

  const totalAvg = toNumber(latencyResult?.total_avg_sec)
  const fluencyLabel = latencyResult?.sample_fluency_label || 'Unknown'

  return (
    <div className={`latency-result-page ${theme === 'light' ? 'latency-result-page--light' : ''} ${mounted ? 'latency-result-page--mounted' : ''}`}>
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
        {loading ? (
          <div className="empty-state">
            <p className="empty-state__title">Loading benchmark results...</p>
            <p className="empty-state__sub">Fetching your latency report.</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="empty-state__title">Unable to load benchmark results</p>
            <p className="empty-state__sub">{error}</p>
            <div className="action-bar empty-state__actions">
              <Link to="/latency" className="btn-primary">Run Benchmark →</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="page-header">
              <p className="page-header__eyebrow">Benchmark Complete</p>
              <h1 className="page-header__title">Latency <span>Results</span></h1>
              <p className="page-header__sub">
                {latencyResult?.runs || 0} consecutive runs completed.
                {' '}All times in seconds. LLM excluded to preserve quota.
              </p>

              <div className="device-strip">
                <div className="device-chip">
                  <span className="device-chip__icon">{latencyResult?.cuda_available ? '🟢' : '🔵'}</span>
                  <span className="device-chip__label">Device</span>
                  <span className="device-chip__val">{String(latencyResult?.device_used || '--').toUpperCase()}</span>
                </div>
                <div className="device-chip">
                  <span className="device-chip__icon">⚡</span>
                  <span className="device-chip__label">CUDA</span>
                  <span className={`device-chip__val ${latencyResult?.cuda_available ? 'val--green' : 'val--red'}`}>
                    {latencyResult?.cuda_available ? 'Available' : 'Not Available'}
                  </span>
                </div>
                <div className="device-chip">
                  <span className="device-chip__icon">🔁</span>
                  <span className="device-chip__label">Runs</span>
                  <span className="device-chip__val">{latencyResult?.runs || 0}</span>
                </div>
                <div className="device-chip">
                  <span className="device-chip__icon">📊</span>
                  <span className="device-chip__label">Fluency</span>
                  <span className={`device-chip__val ${fluencyClass(fluencyLabel)}`}>{fluencyLabel}</span>
                </div>
              </div>
            </div>

            <div className="summary-grid">
              {stages.map((stage) => {
                const avg = toNumber(latencyResult?.[`${stage.key}_avg_sec`])
                const min = toNumber(latencyResult?.[`${stage.key}_min_sec`])
                const max = toNumber(latencyResult?.[`${stage.key}_max_sec`])
                const spread = Math.max(max - min, 0)

                return (
                  <div key={stage.key} className={`summary-card ${stage.key === 'total' ? 'summary-card--total' : ''}`}>
                    <div className="summary-card__hdr">
                      <span className="summary-card__icon">{stage.icon}</span>
                      <div>
                        <div className="summary-card__label">{stage.label}</div>
                        <div className="summary-card__desc">{stage.desc}</div>
                      </div>
                    </div>

                    <div className="summary-card__avg">{avg}s</div>
                    <div className="summary-card__sub">avg across {latencyResult?.runs || 0} runs</div>

                    <div className="summary-card__range">
                      <span className="range-chip range-chip--min">↓ {min}s</span>
                      <div className="range-bar">
                        <div className="range-bar__fill" data-spread={spread} data-max={max} />
                      </div>
                      <span className="range-chip range-chip--max">↑ {max}s</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="section-block">
              <div className="section-block__hdr">
                <p className="section-block__label">Stage Summary</p>
                <p className="section-block__note">
                  Average · Minimum · Maximum across all {latencyResult?.runs || 0} runs
                </p>
              </div>

              <div className="data-table-wrap" ref={summaryTableRef}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Average (s)</th>
                      <th>Minimum (s)</th>
                      <th>Maximum (s)</th>
                      <th>Spread (s)</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const pct = totalAvg > 0 ? Number(((row.avg / totalAvg) * 100).toFixed(1)) : 0

                      return (
                        <tr key={row.key} className={row.key === 'total' ? 'tr--total' : ''}>
                          <td className="td-stage">
                            <span className="td-icon">{row.icon}</span>
                            {row.name}
                          </td>
                          <td className="td-num td-avg">{row.avg}</td>
                          <td className="td-num td-min">{row.min}</td>
                          <td className="td-num td-max">{row.max}</td>
                          <td className="td-num td-spread">{row.spread}</td>
                          <td className="td-pct">
                            {row.key !== 'total' ? (
                              <div className="pct-bar-wrap">
                                <div className="pct-bar">
                                  <div
                                    className={`pct-bar__fill pct-bar__fill--${row.key}`}
                                    style={{ width: `${barsVisible ? pct : 0}%` }}
                                  />
                                </div>
                                <span>{pct}%</span>
                              </div>
                            ) : (
                              <span className="pct-total">100%</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section-block">
              <div className="section-block__hdr">
                <p className="section-block__label">Per-Run Breakdown</p>
                <p className="section-block__note">
                  Individual latency (seconds) for each of the {latencyResult?.runs || 0} runs
                </p>
              </div>

              <div className="data-table-wrap">
                <table className="data-table data-table--runs">
                  <thead>
                    <tr>
                      <th>Run</th>
                      <th>🎙️ Whisper (s)</th>
                      <th>⚙️ Features (s)</th>
                      <th>📊 ML (s)</th>
                      <th>⏱️ Total (s)</th>
                      <th>vs Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perRunRows.map((row, index) => {
                      const diffClass = row.diff <= 0 ? 'diff--fast' : 'diff--slow'
                      const isFastest = index === fastestRun
                      const isSlowest = index === slowestRun

                      return (
                        <tr key={row.run}>
                          <td className="td-run">{String(row.run).padStart(2, '0')}</td>
                          <td className="td-num">{row.whisper}</td>
                          <td className="td-num">{row.feature}</td>
                          <td className="td-num">{row.ml}</td>
                          <td className="td-num td-total" style={{ color: isFastest ? 'var(--green)' : isSlowest ? 'var(--red)' : undefined }}>
                            {row.total}
                            {isFastest && <span className="diff-chip diff--fast run-tag">FASTEST</span>}
                            {isSlowest && !isFastest && <span className="diff-chip diff--slow run-tag">SLOWEST</span>}
                          </td>
                          <td>
                            <span className={`diff-chip ${diffClass}`}>
                              {row.diff > 0 ? '+' : ''}
                              {row.diff}s
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section-block">
              <div className="section-block__hdr">
                <p className="section-block__label">Sample Transcript</p>
                <p className="section-block__note">From run 01 — used for all benchmark iterations</p>
              </div>
              <div className="transcript-card">
                <p className="transcript-card__text">{latencyResult?.sample_transcript || '— No transcript captured —'}</p>
              </div>
            </div>

            <div className="action-bar">
              <Link to="/latency" className="btn-primary">Run Again →</Link>
              {pdfFile && (
                <a href={`/download/${pdfFile}`} className="btn-ghost">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" width="15" height="15">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </a>
              )}
              <Link to="/dashboard" className="btn-ghost">← Dashboard</Link>
            </div>
          </>
        )}
      </main>

      <footer>
        <p>Dribble</p>
      </footer>
    </div>
  )
}
