import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import styles from './Interviewpage.module.css'
import { readThemePreference, writeThemePreference } from '../theme'
import ThemeSymbolPicker from '../components/ThemeSymbolPicker'
import useCursorGlow from '../hooks/useCursorGlow'

const CATEGORIES = [
  {
    id: 'HR',
    icon: '💼',
    name: 'HR',
    desc: 'Behavioural & culture fit questions',
  },
  {
    id: 'Technical',
    icon: '💻',
    name: 'Technical',
    desc: 'CS concepts, DSA & system design',
  },
  {
    id: 'Behavioral',
    icon: '🧠',
    name: 'Behavioral',
    desc: 'Situation & experience based',
  },
  {
    id: 'Aptitude',
    icon: '📐',
    name: 'Aptitude',
    desc: 'Logic, math & reasoning',
  },
]

const ANALYSIS_LABELS = [
  'Transcribing your audio with Whisper...',
  'Scoring fluency with ML model...',
  'Generating AI feedback with LLM...',
]

const ANALYSIS_STEPS = ['🎙️ Whisper transcription', '📊 Fluency scoring', '🧠 LLM feedback']

const FEEDBACK_SECTIONS = [
  { pattern: /overall\s*rating/i, icon: '⭐', cls: 'rating', title: 'Overall Rating' },
  { pattern: /strength/i, icon: '✅', cls: 'strengths', title: 'Strengths' },
  { pattern: /weakness/i, icon: '⚠️', cls: 'weaknesses', title: 'Weaknesses' },
  { pattern: /suggestion|improv/i, icon: '🚀', cls: 'suggestions', title: 'Suggestions to Improve' },
]

function DribbleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="2.4" />
      <path d="M7 14 Q16 20 18 36" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M3 24 Q14 18 38 26" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M26 3 Q20 16 30 38" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function truncateFileName(name) {
  if (!name) return 'Choose file'
  return name.length > 28 ? `${name.slice(0, 25)}...` : name
}

function escapeHtml(text) {
  return text
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

  for (const section of FEEDBACK_SECTIONS) {
    if (section.pattern.test(stripped)) {
      return section
    }
  }

  return null
}

function parseFeedback(markdown) {
  if (!markdown) {
    return '<div class="fb-empty">No feedback available.</div>'
  }

  const cleaned = markdown.replace(/^-{3,}\s*$/gm, '').trim()
  const lines = cleaned.split('\n')
  const sections = []
  const intro = []
  let current = null

  lines.forEach((raw) => {
    const line = raw.trimEnd()
    const section = detectSection(line)

    if (section) {
      if (current) sections.push(current)
      current = { cls: section.cls, icon: section.icon, title: section.title, rawLines: [] }
      return
    }

    if (current) {
      current.rawLines.push(line)
    } else {
      intro.push(line)
    }
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
      const match = section.rawLines.join(' ').match(/(\d[\d.]*)\s*\/\s*10/)
      if (match) {
        ratingNum = match[1]
      } else {
        const header = lines.find((line) => {
          const detected = detectSection(line)
          return detected && detected.cls === 'rating'
        })

        if (header) {
          const headerMatch = header.match(/(\d[\d.]*)\s*\/\s*10/)
          if (headerMatch) ratingNum = headerMatch[1]
        }
      }
    }

    const items = parseItems(section.rawLines)

    html += `<div class="fb-section fb-section--${section.cls}">`
    html += `<div class="fb-section__hdr">`
    html += `<span class="fb-section__icon">${section.icon}</span>`
    html += `<span class="fb-section__title">${section.title}</span>`
    html += `</div>`
    html += `<div class="fb-section__body">`

    if (section.cls === 'rating' && ratingNum) {
      const width = Math.min((parseFloat(ratingNum) / 10) * 100, 100)
      const color = width >= 70 ? 'var(--green)' : width >= 40 ? 'var(--amber)' : 'var(--red)'
      html += `<div class="fb-rating">`
      html += `<div class="fb-rating__left">`
      html += `<span class="fb-rating__num">${ratingNum}</span>`
      html += `<span class="fb-rating__denom">/10</span>`
      html += `</div>`
      html += `<div class="fb-rating__bar-wrap">`
      html += `<span class="fb-rating__bar">`
      html += `<span class="fb-rating__fill" style="width:${width}%;background:${color}"></span>`
      html += `</span>`
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
      section.rawLines
        .filter((line) => line.trim())
        .forEach((line) => {
          html += `<p class="fb-line">${fmt(line)}</p>`
        })
    }

    html += `</div></div>`
  })

  return html
}

function buildMetrics(data) {
  const wps = data.speaking_rate_wps != null ? data.speaking_rate_wps : null
  const wpm = wps != null ? Math.round(wps * 60) : null
  const dur = data.duration_sec != null ? data.duration_sec : null
  const wc = data.word_count != null ? data.word_count : null
  const tf = data.total_fillers != null ? data.total_fillers : null
  const uwr = data.unique_word_ratio != null ? Math.round(data.unique_word_ratio * 100) : null
  const awl = data.avg_word_length != null ? data.avg_word_length : null
  const sc = data.sentence_count != null ? data.sentence_count : null
  const fillerPct = wc && tf != null ? ((tf / wc) * 100).toFixed(1) : null

  return [
    {
      icon: '⏱️',
      label: 'Duration',
      value: dur != null ? `${dur}s` : '--',
      sub: dur != null ? (dur < 15 ? 'Short answer' : dur > 120 ? 'Lengthy answer' : 'Good length') : '',
      status: dur != null ? (dur >= 20 && dur <= 120 ? 'good' : dur >= 10 ? 'avg' : 'poor') : 'neutral',
    },
    {
      icon: '💬',
      label: 'Word Count',
      value: wc != null ? wc : '--',
      sub: wc != null ? (wc < 40 ? 'Too brief' : wc > 250 ? 'Very detailed' : 'Good range') : '',
      status: wc != null ? (wc >= 60 && wc <= 220 ? 'good' : wc >= 30 ? 'avg' : 'poor') : 'neutral',
    },
    {
      icon: '🚀',
      label: 'Speaking Rate',
      value: wpm != null ? `${wpm} wpm` : '--',
      sub: wpm != null ? (wpm < 100 ? 'Too slow' : wpm > 180 ? 'Too fast' : 'Ideal pace') : '',
      status: wpm != null ? (wpm >= 110 && wpm <= 170 ? 'good' : wpm >= 80 ? 'avg' : 'poor') : 'neutral',
    },
    {
      icon: '🔁',
      label: 'Filler Words',
      value: tf != null ? tf : '--',
      sub: fillerPct != null ? `${fillerPct}% of speech` : '',
      status: tf != null ? (tf === 0 ? 'good' : tf <= 3 ? 'avg' : 'poor') : 'neutral',
    },
    {
      icon: '📚',
      label: 'Vocabulary',
      value: uwr != null ? `${uwr}%` : '--',
      sub: 'Unique word ratio',
      status: uwr != null ? (uwr >= 70 ? 'good' : uwr >= 50 ? 'avg' : 'poor') : 'neutral',
    },
    {
      icon: '📝',
      label: 'Sentences',
      value: sc != null ? sc : '--',
      sub: awl != null ? `Avg word length: ${awl}` : '',
      status: sc != null ? (sc >= 3 ? 'good' : sc >= 1 ? 'avg' : 'poor') : 'neutral',
    },
  ]
}

export default function Interviewpage() {
  const [theme, setTheme] = useState(() => readThemePreference('interview-theme'))
  const [screen, setScreen] = useState('category')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)

  const [audioBlob, setAudioBlob] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [uploadLabel, setUploadLabel] = useState('Choose file')
  const [activeAnswerCard, setActiveAnswerCard] = useState(null)

  const [recordSeconds, setRecordSeconds] = useState(0)
  const [recStatus, setRecStatus] = useState('Click mic to start')
  const [isRecording, setIsRecording] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisLabel, setAnalysisLabel] = useState(ANALYSIS_LABELS[0])

  const [result, setResult] = useState(null)
  const [cursorHover, setCursorHover] = useState(false)
  const { glowRef: cursorGlowRef, dotRef: cursorDotRef } = useCursorGlow({
    hoverSelector: 'a,button,.interview-hover',
    onHoverChange: setCursorHover,
  })
  const [username, setUsername] = useState('User')

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const recordChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const discardRecordingRef = useRef(false)
  const analysisIntervalRef = useRef(null)
  const previewUrlRef = useRef('')

  useEffect(() => {
    const savedUsername = window.localStorage.getItem('username')
    if (savedUsername) setUsername(savedUsername)
  }, [])

  useEffect(() => {
    writeThemePreference(theme, 'interview-theme')
  }, [theme])

  useEffect(() => {
    previewUrlRef.current = audioPreviewUrl
  }, [audioPreviewUrl])

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current)

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const setPreviewUrl = (nextUrl) => {
    if (previewUrlRef.current) {
      window.URL.revokeObjectURL(previewUrlRef.current)
    }

    previewUrlRef.current = nextUrl
    setAudioPreviewUrl(nextUrl)
  }

  const stopRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const clearAnalysisAnimation = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
      analysisIntervalRef.current = null
    }
  }

  const startAnalysisAnimation = () => {
    clearAnalysisAnimation()
    setAnalysisStep(0)
    setAnalysisLabel(ANALYSIS_LABELS[0])

    let i = 0
    analysisIntervalRef.current = setInterval(() => {
      i += 1
      if (i < ANALYSIS_STEPS.length) {
        setAnalysisStep(i)
        setAnalysisLabel(ANALYSIS_LABELS[i])
      } else {
        clearAnalysisAnimation()
      }
    }, 1800)
  }

  const stopRecorderCleanup = (discardCurrent) => {
    const recorder = mediaRecorderRef.current

    if (recorder && recorder.state === 'recording') {
      discardRecordingRef.current = discardCurrent
      recorder.stop()
    }

    stopRecordTimer()
    setIsRecording(false)
    setRecStatus('Click mic to start')
    setRecordSeconds(0)
  }

  const resetQuestionInput = () => {
    setAudioBlob(null)
    setUploadLabel('Choose file')
    setActiveAnswerCard(null)
    setIsSubmitting(false)
    setPreviewUrl('')
    stopRecorderCleanup(true)
  }

  const getQuestions = async (category) => {
    try {
      const response = await fetch('/generate_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category }),
      })

      const raw = await response.text()
      if (!raw) {
        throw new Error(`Server returned an empty response (status ${response.status}).`)
      }

      let data
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error(`Server returned invalid JSON (status ${response.status}).`)
      }

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}.`)
      }

      if (data.error) throw new Error(data.error)
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No questions returned by server.')
      }

      return data.questions
    } catch (error) {
      window.alert(`Failed to generate questions: ${error.message}`)
      return null
    }
  }

  const beginInterview = async () => {
    if (!selectedCategory) return

    setResult(null)
    setScreen('loading')
    resetQuestionInput()

    const generated = await getQuestions(selectedCategory)
    if (!generated) {
      setScreen('category')
      return
    }

    setQuestions(generated)
    setCurrentQ(0)
    setScreen('question')
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.alert('Microphone access is not supported in this browser.')
      return
    }

    try {
      stopRecorderCleanup(true)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      let recorder
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      } catch {
        recorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = recorder
      recordChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        stopRecordTimer()
        setIsRecording(false)

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false
          stopStream()
          return
        }

        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setActiveAnswerCard('record')
        setRecStatus('Recording saved')
        setPreviewUrl(window.URL.createObjectURL(blob))
        stopStream()
      }

      setAudioBlob(null)
      setUploadLabel('Choose file')
      setPreviewUrl('')
      setActiveAnswerCard('record')
      setRecordSeconds(0)
      setRecStatus('Recording... click to stop')
      setIsRecording(true)

      recorder.start(250)

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1)
      }, 1000)
    } catch {
      window.alert('Microphone access denied. Please allow microphone and try again.')
      stopStream()
      stopRecordTimer()
      setIsRecording(false)
      setRecStatus('Click mic to start')
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }

    stopRecordTimer()
    setIsRecording(false)
  }

  const submitAnswer = async () => {
    if (!audioBlob || isSubmitting) return

    setScreen('analyzing')
    setIsSubmitting(true)
    startAnalysisAnimation()

    const formData = new FormData()
    const fileName = audioBlob.name || 'recording.webm'
    formData.append('audio', audioBlob, fileName)
    formData.append('category', selectedCategory)
    formData.append('q_index', currentQ)
    formData.append('question', questions[currentQ])

    try {
      const response = await fetch('/submit_answer', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Server error')
      }

      setResult(data)
      setScreen('result')
    } catch (error) {
      window.alert(`Analysis failed: ${error.message}`)
      setScreen('question')
    } finally {
      clearAnalysisAnimation()
      setIsSubmitting(false)
    }
  }

  const nextQuestion = () => {
    const hasNext = currentQ + 1 < questions.length
    if (!hasNext) return

    setCurrentQ((prev) => prev + 1)
    setResult(null)
    resetQuestionInput()
    setScreen('question')
  }

  const currentQuestion = useMemo(() => questions[currentQ] || '', [questions, currentQ])
  const progress = useMemo(() => {
    if (!questions.length) return 0
    return ((currentQ + 1) / questions.length) * 100
  }, [questions.length, currentQ])

  const feedbackHtml = useMemo(() => parseFeedback(result?.llm_feedback), [result])

  const metrics = useMemo(() => {
    if (!result) return []
    return buildMetrics(result)
  }, [result])

  const fillerEntries = useMemo(() => {
    if (!result || !result.filler_breakdown) return []
    return Object.entries(result.filler_breakdown).filter((entry) => entry[1] > 0)
  }, [result])

  const badgeLabel = (result?.fluency_label || '--').toString()
  const badgeKey = badgeLabel.toLowerCase().replace(/\s+/g, '-')

  const badgeClassMap = {
    fluent: styles.badgeFluent,
    'non-fluent': styles.badgeNonFluent,
    moderate: styles.badgeModerate,
    good: styles.badgeGood,
    average: styles.badgeAverage,
    poor: styles.badgePoor,
  }

  const metricClassMap = {
    good: styles.metricTileGood,
    avg: styles.metricTileAvg,
    poor: styles.metricTilePoor,
    neutral: styles.metricTileNeutral,
  }

  const beginButtonText = selectedCategory
    ? `Begin ${selectedCategory} Interview →`
    : 'Select a category to begin'

  const questionNumber = String(currentQ + 1).padStart(2, '0')
  const hasUploadedFile = activeAnswerCard === 'upload' && audioBlob && audioBlob.name

  return (
    <div className={`${styles.page} ${theme === 'light' ? styles.pageLight : ''}`}>
      {createPortal(
        <>
          <div ref={cursorGlowRef} className={styles.cursorGlow} />
          <div ref={cursorDotRef} className={`${styles.cursorDot} ${cursorHover ? styles.cursorDotHover : ''}`} />
        </>,
        document.body
      )}

      <nav className={styles.navbar}>
        <Link to="/" className={styles.navLogo}>
          <DribbleIcon className={styles.logoIcon} />
          <span className={styles.logoText}>Dribble</span>
        </Link>

        <div className={styles.navLinks}>
          <Link to="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link to="/latency" className={styles.navLink}>Latency</Link>
        </div>

        <div className={styles.navRight}>
          <ThemeSymbolPicker theme={theme} onChange={setTheme} />

          <div className={styles.navUser}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>{username}</span>
          </div>

          <a href="/logout" className={styles.navLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </a>
        </div>
      </nav>

      <main className={styles.main}>
        {screen === 'category' && (
          <section className={styles.screen}>
            <div className={styles.screenInner}>
              <p className={styles.screenEyebrow}>AI Interview · Step 1 of 2</p>
              <h1 className={styles.screenTitle}>
                Choose Your
                <br />
                <span className={styles.screenTitleAccent}>Category</span>
              </h1>
              <p className={styles.screenSub}>
                Select the type of interview you want to practice. Gemini AI will generate 5 questions
                tailored to that category.
              </p>

              <div className={styles.catGrid}>
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`${styles.catCard} ${selectedCategory === category.id ? styles.catCardSelected : ''} interview-hover`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className={styles.catCardIcon}>{category.icon}</span>
                    <span className={styles.catCardName}>{category.name}</span>
                    <span className={styles.catCardDesc}>{category.desc}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`${styles.btnPrimary} interview-hover`}
                id="btnBegin"
                disabled={!selectedCategory}
                onClick={beginInterview}
              >
                <span>{beginButtonText}</span>
                <span className={styles.btnPrimaryArrow}>→</span>
              </button>
            </div>
          </section>
        )}

        {screen === 'loading' && (
          <section className={styles.screen}>
            <div className={`${styles.screenInner} ${styles.screenInnerCenter}`}>
              <div className={styles.loader}>
                <div className={styles.loaderRing} />
                <div className={`${styles.loaderRing} ${styles.loaderRing2}`} />
              </div>
              <p className={styles.loaderLabel}>Generating questions with Gemini AI...</p>
              <p className={styles.loaderSub}>This takes just a moment</p>
            </div>
          </section>
        )}

        {screen === 'question' && (
          <section className={styles.screen}>
            <div className={`${styles.screenInner} ${styles.screenInnerQuestion}`}>
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressLabel}>Question {currentQ + 1} / {questions.length}</span>
              </div>

              <div className={styles.questionBlock}>
                <span className={styles.questionBlockCat}>{selectedCategory}</span>
                <p className={styles.questionBlockNum}>{questionNumber}</p>
                <h2 className={styles.questionBlockText}>{currentQuestion}</h2>
              </div>

              <div className={styles.answerOptions}>
                <div className={`${styles.answerCard} ${activeAnswerCard === 'upload' ? styles.answerCardActive : ''} interview-hover`}>
                  <div className={styles.answerCardHeader}>
                    <span className={styles.answerCardIcon}>📁</span>
                    <span className={styles.answerCardTitle}>Upload Audio</span>
                  </div>
                  <p className={styles.answerCardDesc}>
                    Select a pre-recorded .mp3, .wav, .m4a or .webm file from your device.
                  </p>
                  <label className={`${styles.uploadLabel} ${hasUploadedFile ? styles.uploadHasFile : ''} interview-hover`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="22" height="22">
                      <polyline points="16 16 12 12 8 16" />
                      <line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                    </svg>
                    <span>{uploadLabel}</span>
                    <input
                      type="file"
                      accept="audio/*,.webm"
                      className={styles.hiddenInput}
                      onChange={(event) => {
                        const file = event.target.files && event.target.files[0]
                        if (!file) return

                        stopRecorderCleanup(true)
                        setAudioBlob(file)
                        setUploadLabel(truncateFileName(file.name))
                        setActiveAnswerCard('upload')
                        setPreviewUrl(window.URL.createObjectURL(file))
                        setRecStatus('Click mic to start')
                      }}
                    />
                  </label>
                </div>

                <div className={styles.answerOr}>OR</div>

                <div className={`${styles.answerCard} ${activeAnswerCard === 'record' ? styles.answerCardActive : ''} interview-hover`}>
                  <div className={styles.answerCardHeader}>
                    <span className={styles.answerCardIcon}>🎙️</span>
                    <span className={styles.answerCardTitle}>Record Live</span>
                  </div>
                  <p className={styles.answerCardDesc}>
                    Record your answer directly in the browser using your microphone.
                  </p>

                  <div className={styles.recorder}>
                    <button
                      type="button"
                      className={`${styles.recorderBtn} ${isRecording ? styles.recorderBtnRecording : ''} interview-hover`}
                      title="Start recording"
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="28" height="28">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>

                    <div className={styles.recorderInfo}>
                      <span className={styles.recorderStatus}>{recStatus}</span>
                      <span className={styles.recorderTimer}>{formatTimer(recordSeconds)}</span>
                    </div>

                    <div className={`${styles.recorderWave} ${isRecording ? styles.recorderWaveAnimating : ''}`}>
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                      <span className={styles.waveBar} />
                    </div>
                  </div>

                  {audioPreviewUrl && <audio controls src={audioPreviewUrl} className={styles.audioPreview} />}
                </div>
              </div>

              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnPrimarySubmit} interview-hover`}
                disabled={!audioBlob}
                onClick={submitAnswer}
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Answer'}</span>
                <span className={styles.btnPrimaryArrow}>→</span>
              </button>

              <p className={styles.skipNote}>
                <Link to="/dashboard" className={styles.skipLink}>← Back to Dashboard</Link>
              </p>
            </div>
          </section>
        )}

        {screen === 'analyzing' && (
          <section className={styles.screen}>
            <div className={`${styles.screenInner} ${styles.screenInnerCenter}`}>
              <div className={styles.loader}>
                <div className={styles.loaderRing} />
                <div className={`${styles.loaderRing} ${styles.loaderRing2}`} />
              </div>
              <p className={styles.loaderLabel}>{analysisLabel}</p>
              <p className={styles.loaderSub}>Analysing your answer with AI</p>

              <div className={styles.analyzeSteps}>
                {ANALYSIS_STEPS.map((stepText, index) => (
                  <div
                    key={stepText}
                    className={`${styles.analyzeStep} ${index === analysisStep ? styles.analyzeStepActive : ''} ${index < analysisStep ? styles.analyzeStepDone : ''}`}
                  >
                    {stepText}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {screen === 'result' && result && (
          <section className={styles.screen}>
            <div className={`${styles.screenInner} ${styles.screenInnerResult}`}>
              <p className={styles.screenEyebrow}>
                Question {currentQ + 1} of {questions.length} — Result
              </p>

              <div className={styles.resultRowTop}>
                <div className={`${styles.resultCard} ${styles.resultCardScore}`}>
                  <p className={styles.resultCardLabel}>Fluency Score</p>
                  <div className={styles.resultScore}>
                    {typeof result.fluency_score === 'number' ? `${result.fluency_score}/10` : '--'}
                  </div>
                  <div className={`${styles.resultBadge} ${badgeClassMap[badgeKey] || ''}`}>{badgeLabel}</div>
                </div>

                <div className={`${styles.resultCard} ${styles.resultCardTranscript}`}>
                  <p className={styles.resultCardLabel}>Your Transcript</p>
                  <p className={styles.resultTranscript}>{result.transcript || '--'}</p>
                </div>
              </div>

              <div className={`${styles.resultCard} ${styles.resultMetricsCard}`}>
                <p className={styles.resultCardLabel}>Speech Metrics</p>

                <div className={styles.metricsGrid}>
                  {metrics.map((metric) => (
                    <div key={metric.label} className={`${styles.metricTile} ${metricClassMap[metric.status] || styles.metricTileNeutral}`}>
                      <span className={styles.metricTileIcon}>{metric.icon}</span>
                      <div className={styles.metricTileBody}>
                        <span className={styles.metricTileValue}>{metric.value}</span>
                        <span className={styles.metricTileLabel}>{metric.label}</span>
                        {metric.sub ? <span className={styles.metricTileSub}>{metric.sub}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>

                {fillerEntries.length > 0 && (
                  <div className={styles.fillerRow}>
                    <span className={styles.fillerRowLabel}>Filler breakdown</span>
                    <div className={styles.fillerTags}>
                      {fillerEntries.map(([word, count]) => (
                        <span key={word} className={styles.fillerTag}>
                          "{word}" <strong>{count}×</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${styles.resultCard} ${styles.resultCardFeedback}`}>
                <p className={styles.resultCardLabel}>Gemini AI Feedback</p>
                <div className={styles.resultFeedback} dangerouslySetInnerHTML={{ __html: feedbackHtml }} />
              </div>

              <div className={styles.resultActions}>
                {currentQ + 1 < questions.length ? (
                  <button type="button" className={`${styles.btnPrimary} interview-hover`} onClick={nextQuestion}>
                    <span>Next Question ({currentQ + 2}/{questions.length}) →</span>
                  </button>
                ) : (
                  <a href="/dashboard" className={`${styles.btnGhost} interview-hover`}>
                    View Full History
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {screen === 'done' && (
          <section className={styles.screen}>
            <div className={`${styles.screenInner} ${styles.screenInnerCenter}`}>
              <div className={styles.doneIcon}>✅</div>
              <h2 className={styles.doneTitle}>Interview Complete!</h2>
              <p className={styles.doneSub}>You've answered all 5 questions. Your results are saved in your history.</p>
              <div className={styles.doneActions}>
                <a href="/dashboard" className={styles.btnPrimary}>← Back to Dashboard</a>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footerStrip}>
        <p>Dribble</p>
      </footer>
    </div>
  )
}