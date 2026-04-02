import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

/* ══════════════════════════════════════
   DRIBBLE SVG ICON
══════════════════════════════════════ */
function DribbleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" stroke="#c8c8c8" strokeWidth="2.4" />
      <path d="M7 14 Q16 20 18 36"  stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M3 24 Q14 18 38 26"  stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M26 3 Q20 16 30 38"  stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ══════════════════════════════════════
   HOOK — TYPING ANIMATION
   Cycles through an array of words
══════════════════════════════════════ */
function useTypingEffect(words, typingSpeed = 80, deletingSpeed = 45, pauseMs = 1800) {
  const [display, setDisplay]   = useState('')
  const [wordIdx, setWordIdx]   = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = words[wordIdx % words.length]

    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, display.length + 1))
        if (display.length + 1 === current.length) {
          setTimeout(() => setDeleting(true), pauseMs)
        }
      } else {
        setDisplay(current.slice(0, display.length - 1))
        if (display.length - 1 === 0) {
          setDeleting(false)
          setWordIdx(i => i + 1)
        }
      }
    }, deleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [display, deleting, wordIdx, words, typingSpeed, deletingSpeed, pauseMs])

  return display
}

/* ══════════════════════════════════════
   HOOK — ANIMATED COUNTER
══════════════════════════════════════ */
function useCounter(target, duration = 1600, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])

  return count
}

/* ══════════════════════════════════════
   COMPONENT — PARTICLE GRID
   Subtle animated dot grid in background
══════════════════════════════════════ */
function ParticleGrid() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const dots = []
    const COLS = Math.ceil(window.innerWidth  / 60)
    const ROWS = Math.ceil(window.innerHeight / 60)

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        dots.push({
          x:     c * 60 + 30,
          y:     r * 60 + 30,
          base:  Math.random() * 0.15 + 0.04,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.012 + 0.006,
        })
      }
    }

    let frame
    let t = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 1
      dots.forEach(d => {
        const alpha = d.base + Math.sin(t * d.speed + d.phase) * 0.06
        ctx.beginPath()
        ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.fill()
      })
      frame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.particleCanvas} />
}

/* ══════════════════════════════════════
   COMPONENT — NAVBAR
══════════════════════════════════════ */
function Navbar({ scrolled }) {
  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <Link to="/" className={styles.navLogo}>
        <DribbleIcon className={styles.logoIcon} />
        <span className={styles.logoText}>Dribble</span>
      </Link>
    </nav>
  )
}

/* ══════════════════════════════════════
   COMPONENT — FEATURE TAG
   Small animated pill showing a feature
══════════════════════════════════════ */
function FeatureTag({ icon, text, delay }) {
  return (
    <div className={styles.featureTag} style={{ animationDelay: delay }}>
      <span className={styles.featureTagIcon}>{icon}</span>
      {text}
    </div>
  )
}

/* ══════════════════════════════════════
   COMPONENT — STAT CARD
   Animated counter card
══════════════════════════════════════ */
function StatCard({ num, label, isText, started }) {
  const numericTarget = isText ? 0 : parseInt(num.replace(/\D/g,'')) || 0
  const count = useCounter(numericTarget, 1400, started)

  return (
    <div className={styles.statCard}>
      <div className={styles.statNum}>
        {isText ? num : (numericTarget > 0 ? count + (num.includes('+') ? '+' : '') : num)}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}



/* ══════════════════════════════════════
   COMPONENT — SCROLL HINT
══════════════════════════════════════ */
function ScrollHint() {
  return (
    <div className={styles.scrollHint}>
      <div className={styles.scrollMouse}>
        <div className={styles.scrollWheel} />
      </div>
      <span className={styles.scrollText}>Scroll</span>
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN — LANDING PAGE
══════════════════════════════════════ */
export default function LandingPage() {
  const glowRef    = useRef(null)
  const statsRef   = useRef(null)
  const [scrolled, setScrolled]       = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const [btnHover, setBtnHover]         = useState(false)
  const navigate = useNavigate()

  const typedWord = useTypingEffect(
    ['Smarter.', 'Confidently.', 'Clearly.', 'Better.'],
    75, 40, 2000
  )

  /* Cursor glow */
  useEffect(() => {
    const glow = glowRef.current
    if (!glow) return
    const move = (e) => {
      glow.style.left = `${e.clientX}px`
      glow.style.top  = `${e.clientY}px`
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  /* Navbar scroll effect */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Stats counter trigger on scroll into view */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const features = [
    { icon: '🎙️', text: 'Audio Analysis',    delay: '0.6s'  },
    { icon: '🧠', text: 'AI Feedback',         delay: '0.75s' },
    { icon: '📊', text: 'Fluency Scoring',     delay: '0.9s'  },
    { icon: '⚡', text: 'Real-Time Results',   delay: '1.05s' },
  ]

  const stats = [
    { num: 'Audio',     label: 'Answer Input',         isText: true  },
    { num: 'AI',        label: 'Powered Analysis',      isText: true  },
    { num: 'Real-Time', label: 'Structured Feedback',   isText: true  },
  ]

  return (
    <div className={styles.page}>

      {/* Cursor glow */}
      <div ref={glowRef} className={styles.cursorGlow} />

      {/* Particle dot grid */}
      <ParticleGrid />

      <section className={styles.hero}>

        {/* Background */}
        <div className={styles.heroBg} />

        {/* Dark gradient overlay for readability */}
        <div className={styles.heroOverlay} />

        {/* Navbar */}
        <Navbar scrolled={scrolled} />

        {/* ── HERO CONTENT ── */}
        <div className={styles.heroContent}>

          {/* Eyebrow */}
          <p className={styles.heroEyebrow}>
            AI-Powered Interview Coaching
          </p>

          {/* Headline with typing effect */}
          <h1 className={styles.heroHeadline}>
            Speak
            <br />
            <span className={styles.headlineOutline}>Interview</span>
            <br />
            <span className={styles.headlineTyped}>
              {typedWord}
              <span className={styles.cursor}>|</span>
            </span>
          </h1>

          {/* Feature tags */}
          <div className={styles.featureTags}>
            {features.map(f => (
              <FeatureTag key={f.text} icon={f.icon} text={f.text} delay={f.delay} />
            ))}
          </div>

          {/* CTA Buttons */}
          <div className={styles.heroActions}>
            <button
              onClick={() => navigate('/login')}
              className={`${styles.btn} ${styles.btnPrimary}`}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
            >
              <span className={styles.btnBg} />
              <span className={styles.btnLabel}>Get Started</span>
              <span className={`${styles.btnArrow} ${btnHover ? styles.btnArrowActive : ''}`}>
                →
              </span>
            </button>

            <Link to="/knowmore" className={`${styles.btn} ${styles.btnGhost}`}>
              <span>Know More</span>
            </Link>
          </div>

        </div>

        {/* ── STATS BAR ── */}
        <div className={styles.heroFooter} ref={statsRef}>
          {stats.map((s, i) => (
            <>
              <StatCard key={s.label} {...s} started={statsVisible} />
              {i < stats.length - 1 && (
                <div key={`div-${i}`} className={styles.footerDivider} />
              )}
            </>
          ))}
        </div>

        {/* Scroll hint */}
        <ScrollHint />

      </section>
    </div>
  )
}