import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './Reportpage.css'
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmt(text) {
  let safe = escapeHtml(text)
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  safe = safe.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  safe = safe.replace(/`(.+?)`/g, '<code class="fb-code">$1</code>')
  return safe
}

function parseItems(lines) {
  const items = []
  let current = ''

  lines.forEach((raw) => {
    const line = raw.trimEnd()

    if (!line.trim()) {
      if (current.trim()) {
        items.push(current.trim())
        current = ''
      }
      return
    }

    if (/^[*-]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (current.trim()) items.push(current.trim())
      current = line.replace(/^[*-]\s+/, '').replace(/^\d+\.\s+/, '')
      return
    }

    current += ` ${line.trim()}`
  })

  if (current.trim()) items.push(current.trim())
  return items.filter((item) => item.length > 2)
}

function plainMarkdown(md) {
  return md
    .split('\n')
    .map((line) => `<p class="fb-line">${fmt(line.trimEnd())}</p>`)
    .join('')
}

function detectSection(line) {
  const stripped = line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').replace(/:$/, '').trim()

  const sections = [
    { pattern: /overall\s*rating/i, icon: '⭐', cls: 'rating', title: 'Overall Rating' },
    { pattern: /strength/i, icon: '✅', cls: 'strengths', title: 'Strengths' },
    { pattern: /weakness/i, icon: '⚠️', cls: 'weaknesses', title: 'Weaknesses' },
    { pattern: /suggestion|improv/i, icon: '🚀', cls: 'suggestions', title: 'Suggestions to Improve' },
  ]

  return sections.find((section) => section.pattern.test(stripped)) || null
}

function parseFeedback(md) {
  if (!md) return '<div class="fb-empty">No feedback available.</div>'

  const cleaned = String(md).replace(/^-{3,}\s*$/gm, '').trim()
  const lines = cleaned.split('\n')
  const sections = []
  const intro = []
  let current = null

  lines.forEach((raw) => {
    const line = raw.trimEnd()
    const section = detectSection(line)

    if (section) {
      if (current) sections.push(current)
      current = { cls: section.cls, icon: section.icon, title: section.title, rawLines: [], headerLine: line }
      return
    }

    if (current) current.rawLines.push(line)
    else intro.push(line)
  })

  if (current) sections.push(current)
  if (sections.length === 0) return plainMarkdown(cleaned)

  let html = ''
  const introText = intro.join(' ').replace(/\*\*/g, '').trim()

  if (introText && introText.length > 4) {
    html += `<p class="fb-intro">${fmt(introText)}</p>`
  }

  sections.forEach((section) => {
    let ratingNum = null

    if (section.cls === 'rating') {
      const source = [section.headerLine, ...section.rawLines].join(' ')
      const match = source.match(/(\d[\d.]*)\s*\/\s*10/)
      if (match) ratingNum = match[1]
    }

    const items = parseItems(section.rawLines)

    html += `<div class="fb-section fb-section--${section.cls}">`
    html += `<div class="fb-section__hdr">`
    html += `<span class="fb-section__icon">${section.icon}</span>`
    html += `<span class="fb-section__title">${section.title}</span>`
    html += `</div>`
    html += `<div class="fb-section__body">`

    if (section.cls === 'rating' && ratingNum) {
      const pct = Math.min((parseFloat(ratingNum) / 10) * 100, 100)
      const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)'

      html += `<div class="fb-rating">`
      html += `<div class="fb-rating__left">`
      html += `<span class="fb-rating__num">${ratingNum}</span>`
      html += `<span class="fb-rating__denom">/10</span>`
      html += `</div>`
      html += `<div class="fb-rating__bar-wrap">`
      html += `<div class="fb-rating__bar"><div class="fb-rating__fill" style="width:${pct}%;background:${color}"></div></div>`
      html += `<span class="fb-rating__pct" style="color:${color}">${ratingNum}/10</span>`
      html += `</div>`
      html += `</div>`
    } else if (items.length > 0) {
      html += `<ul class="fb-items">`
      items.forEach((item) => {
        html += `<li class="fb-item fb-item--${section.cls}">`
        html += `<span class="fb-item__dot"></span>`
        html += `<span class="fb-item__text">${fmt(item)}</span>`
        html += `</li>`
      })
      html += `</ul>`
    } else {
      section.rawLines.filter((line) => line.trim()).forEach((line) => {
        html += `<p class="fb-line">${fmt(line)}</p>`
      })
    }

    html += `</div></div>`
  })

  return html
}

function badgeClass(label) {
  const key = String(label || '').toLowerCase().replace(/\s+/g, '-')
  if (key === 'fluent' || key === 'good') return 'fluent'
  if (key === 'moderate' || key === 'average') return 'moderate'
  return 'non-fluent'
}

function metricStatus(metric, type) {
  if (type === 'duration') return metric >= 20 && metric <= 120 ? 'good' : metric >= 10 ? 'avg' : 'poor'
  if (type === 'wordCount') return metric >= 60 && metric <= 220 ? 'good' : metric >= 30 ? 'avg' : 'poor'
  if (type === 'wpm') return metric >= 110 && metric <= 170 ? 'good' : metric >= 80 ? 'avg' : 'poor'
  if (type === 'fillers') return metric === 0 ? 'good' : metric <= 3 ? 'avg' : 'poor'
  if (type === 'uwr') return metric >= 70 ? 'good' : metric >= 50 ? 'avg' : 'poor'
  if (type === 'sentences') return metric >= 3 ? 'good' : metric >= 1 ? 'avg' : 'poor'
  return 'neutral'
}

export default function Reportpage() {
  const { resultId } = useParams()
  const { glowRef } = useCursorGlow()

  const [theme, setTheme] = useState(() => readThemePreference('report-theme'))
  const [username, setUsername] = useState(() => window.localStorage.getItem('username') || 'user')
  const [role, setRole] = useState('user')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    writeThemePreference(theme, 'report-theme')
  }, [theme])

  useEffect(() => {
    let active = true

    const loadReport = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/result/${resultId}`, {
          credentials: 'include',
        })

        const raw = await response.text()
        let data = {}

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          throw new Error('Server returned an invalid report response.')
        }

        if (!response.ok || !data.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error(data.error || 'Unable to load report.')
        }

        if (!active) return

        setReportData(data)
        setUsername(data.username || 'user')
        setRole(data.role || 'user')

        if (data.username) {
          window.localStorage.setItem('username', data.username)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load report.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadReport()

    return () => {
      active = false
    }
  }, [resultId])

  const result = reportData?.result || {}
  const features = reportData?.features || {}
  const wordCount = Number(reportData?.word_count || 0)
  const totalFillers = Number(reportData?.total_fillers || 0)
  const duration = Number(features.duration_sec || 0)
  const wps = Number(features.speaking_rate_wps || 0)
  const wpm = Math.round(wps * 60)
  const uniqueWordRatio = Math.round(Number(features.unique_word_ratio || 0) * 100)
  const avgWordLength = Number(features.avg_word_length || 0)
  const sentenceCount = Number(features.sentence_count || 0)
  const fillerPct = wordCount > 0 ? ((totalFillers / wordCount) * 100).toFixed(1) : '0.0'

  const feedbackHtml = useMemo(() => parseFeedback(result.llm_feedback || ''), [result.llm_feedback])
  const fillerBreakdown = reportData?.filler_breakdown || {}

  return (
    <div className={`report-page ${theme === 'light' ? 'light' : ''}`}>
      <div ref={glowRef} className="cursor-glow" />

      <nav>
        <Link to="/" className="nav__logo">
          <DribbleIcon className="logo__icon" />
          <span className="logo__text">Dribble</span>
        </Link>

        <div className="nav__links">
          <Link to="/dashboard" className="nav__link">Dashboard</Link>
          <Link to="/interview" className="nav__link">New Interview</Link>
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
            <p className="empty-state__title">Loading report...</p>
            <p className="empty-state__sub">Fetching result details.</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="empty-state__title">Unable to load report</p>
            <p className="empty-state__sub">{error}</p>
          </div>
        ) : (
          <>
            <div className="page-header">
              <p className="page-header__eyebrow">Interview Report</p>
              <h1 className="page-header__title">
                {result.category || 'Interview'} <span>Interview</span>
              </h1>
              <p className="page-header__question">{result.question || 'No question available'}</p>

              <div className="page-header__meta">
                <span className="meta-chip">{result.timestamp || '-'}</span>
                <span className="meta-chip">{result.username || username}</span>
                <span className="meta-chip">{result.category || '-'}</span>
              </div>
            </div>

            <div className="row-top">
              <div className="card score-card">
                <span className="card__label">Fluency Score</span>
                <div className="score-value">{reportData?.fluency_score ?? '--'}<small>/10</small></div>
                <div className={`score-badge ${badgeClass(result.fluency_label)}`}>{result.fluency_label || 'Unknown'}</div>
              </div>

              <div className="card">
                <span className="card__label">Your Transcript</span>
                <p className="transcript-text">{result.transcript || '-- No transcript available --'}</p>
              </div>
            </div>

            <div className="card metrics-card">
              <span className="card__label">Speech Metrics</span>

              <div className="metrics-grid">
                <div className={`metric-tile metric-tile--${metricStatus(duration, 'duration')}`}>
                  <span className="metric-tile__icon">TIME</span>
                  <div className="metric-tile__body">
                    <span className="metric-tile__value">{duration}s</span>
                    <span className="metric-tile__label">Duration</span>
                    <span className="metric-tile__sub">{duration < 15 ? 'Short answer' : duration > 120 ? 'Lengthy answer' : 'Good length'}</span>
                  </div>
                </div>

                <div className={`metric-tile metric-tile--${metricStatus(wordCount, 'wordCount')}`}>
                  <span className="metric-tile__icon">WORDS</span>
                  <div className="metric-tile__body">
                    <span className="metric-tile__value">{wordCount}</span>
                    <span className="metric-tile__label">Word Count</span>
                    <span className="metric-tile__sub">{wordCount < 40 ? 'Too brief' : wordCount > 250 ? 'Very detailed' : 'Good range'}</span>
                  </div>
                </div>

                <div className={`metric-tile metric-tile--${metricStatus(wpm, 'wpm')}`}>
                  <span className="metric-tile__icon">PACE</span>
                  <div className="metric-tile__body">
                    <span className="metric-tile__value">{wpm} wpm</span>
                    <span className="metric-tile__label">Speaking Rate</span>
                    <span className="metric-tile__sub">{wpm < 100 ? 'Too slow' : wpm > 180 ? 'Too fast' : 'Ideal pace'}</span>
                  </div>
                </div>

                <div className={`metric-tile metric-tile--${metricStatus(totalFillers, 'fillers')}`}>
                  <span className="metric-tile__icon">FILLERS</span>
                  <div className="metric-tile__body">
                    <span className="metric-tile__value">{totalFillers}</span>
                    <span className="metric-tile__label">Filler Words</span>
                    <span className="metric-tile__sub">{fillerPct}% of speech</span>
                  </div>
                </div>

                <div className={`metric-tile metric-tile--${metricStatus(uniqueWordRatio, 'uwr')}`}>
                  <span className="metric-tile__icon">VOCAB</span>
                  <div className="metric-tile__body">
                    <span className="metric-tile__value">{uniqueWordRatio}%</span>
                    <span className="metric-tile__label">Vocabulary</span>
                    <span className="metric-tile__sub">Unique word ratio</span>
                  </div>
                </div>

                <div className={`metric-tile metric-tile--${metricStatus(sentenceCount, 'sentences')}`}>
                  <span className="metric-tile__icon">LINES</span>
                  <div className="metric-tile__body">
                    <span className="metric-tile__value">{sentenceCount}</span>
                    <span className="metric-tile__label">Sentences</span>
                    <span className="metric-tile__sub">Avg word: {avgWordLength} chars</span>
                  </div>
                </div>
              </div>

              {Object.keys(fillerBreakdown).length > 0 ? (
                <div className="filler-row">
                  <span className="filler-row__label">Filler breakdown</span>
                  <div className="filler-tags">
                    {Object.entries(fillerBreakdown).map(([word, count]) => (
                      <span key={word} className="filler-tag">"{word}" <strong>{count}x</strong></span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="filler-row">
                  <span className="no-fillers">No filler words detected - clean delivery.</span>
                </div>
              )}
            </div>

            <div className="card feedback-card">
              <span className="card__label">Gemini AI Feedback</span>
              <div className="feedback-body" dangerouslySetInnerHTML={{ __html: feedbackHtml }} />
            </div>

            <div className="action-bar">
              <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
              {result.pdf_file && (
                <a href={`/download/${result.pdf_file}`} className="btn-ghost">
                  Download PDF
                </a>
              )}
              <Link to="/interview" className="btn-ghost">Practice Again</Link>
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
