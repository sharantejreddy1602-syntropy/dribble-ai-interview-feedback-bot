import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import './KnowMorePage.css'

const PIPELINE_STEPS = [
  {
    title: 'Audio Input',
    description: 'You record or upload your spoken interview answer as an audio file directly in the browser.'
  },
  {
    title: 'Transcription',
    description: 'OpenAI Whisper converts your speech to text, preserving natural phrasing and timing cues.'
  },
  {
    title: 'AI Analysis',
    description: 'The transcript is scored by an ML fluency model and analyzed by an LLM for content quality.'
  },
  {
    title: 'Feedback Report',
    description: 'Results are structured into a detailed report with fluency score, clarity, relevance, and next steps.'
  }
]

const COMPONENTS = [
  {
    tag: 'Speech Layer',
    icon: '🎙️',
    title: 'OpenAI Whisper',
    description: 'A robust automatic speech recognition model that transcribes audio with high accuracy across accents and noise conditions.'
  },
  {
    tag: 'ML Model',
    icon: '📊',
    title: 'Fluency Predictor',
    description: 'A custom-trained scikit-learn model scoring transcripts on filler word density, sentence structure, and speech coherence.'
  },
  {
    tag: 'Language Intelligence',
    icon: '🧠',
    title: 'LLM Feedback Engine',
    description: 'A large language model analyzes the transcript and generates structured feedback on clarity, depth, and relevance.'
  },
  {
    tag: 'Backend Framework',
    icon: '⚙️',
    title: 'Flask Web Server',
    description: 'A lightweight Flask backend routes audio uploads, manages sessions, triggers the pipeline, and returns report data.'
  },
  {
    tag: 'Data Layer',
    icon: '🗂️',
    title: 'Structured Results',
    description: 'Feedback outputs are persisted as JSON and can be reviewed later through dashboard and report pages.'
  },
  {
    tag: 'Performance',
    icon: '⚡',
    title: 'Latency Testing',
    description: 'A dedicated latency flow benchmarks model inference time so the interview pipeline stays fast and responsive.'
  }
]

function scramble(text, progress, chars) {
  return text
    .split('')
    .map((char, index) => {
      if (char === ' ') return char
      return index < progress ? char : chars[Math.floor(Math.random() * chars.length)]
    })
    .join('')
}

export default function KnowMorePage() {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const cursorGlowRef = useRef(null)
  const cursorDotRef = useRef(null)

  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isLeaving, setIsLeaving] = useState(false)
  const [taglineText, setTaglineText] = useState('Under The Hood')

  useEffect(() => {
    const finalText = 'Under The Hood'
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let intervalId

    const startTimer = window.setTimeout(() => {
      const steps = 18
      let frame = 0

      intervalId = window.setInterval(() => {
        frame += 1
        const progress = Math.floor((frame / steps) * finalText.length)

        if (frame >= steps) {
          setTaglineText(finalText)
          window.clearInterval(intervalId)
          return
        }

        setTaglineText(scramble(finalText, progress, chars))
      }, 40)
    }, 350)

    return () => {
      window.clearTimeout(startTimer)
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [])

  useEffect(() => {
    const updateScrollData = () => {
      const top = window.scrollY || document.documentElement.scrollTop
      const fullHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = fullHeight > 0 ? Math.min(100, (top / fullHeight) * 100) : 0

      setIsScrolled(top > 60)
      setScrollProgress(progress)
    }

    updateScrollData()
    window.addEventListener('scroll', updateScrollData, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateScrollData)
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const cursorGlow = cursorGlowRef.current
    const cursorDot = cursorDotRef.current
    if (!root || !cursorGlow || !cursorDot) return

    const canShowCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canShowCursor) {
      cursorGlow.style.display = 'none'
      cursorDot.style.display = 'none'
      return
    }

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let glowX = mouseX
    let glowY = mouseY
    let rafId

    cursorDot.style.left = `${mouseX}px`
    cursorDot.style.top = `${mouseY}px`
    cursorGlow.style.left = `${glowX}px`
    cursorGlow.style.top = `${glowY}px`

    const onMouseMove = event => {
      mouseX = event.clientX
      mouseY = event.clientY
      cursorDot.style.left = `${mouseX}px`
      cursorDot.style.top = `${mouseY}px`
    }

    const animateGlow = () => {
      glowX += (mouseX - glowX) * 0.08
      glowY += (mouseY - glowY) * 0.08
      cursorGlow.style.left = `${glowX}px`
      cursorGlow.style.top = `${glowY}px`
      rafId = window.requestAnimationFrame(animateGlow)
    }

    const hoverTargets = root.querySelectorAll('a, button, .km-step, .km-component-card')
    const onHoverStart = () => cursorDot.classList.add('hovering')
    const onHoverEnd = () => cursorDot.classList.remove('hovering')

    hoverTargets.forEach(target => {
      target.addEventListener('mouseenter', onHoverStart)
      target.addEventListener('mouseleave', onHoverEnd)
    })

    document.addEventListener('mousemove', onMouseMove)
    animateGlow()

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      hoverTargets.forEach(target => {
        target.removeEventListener('mouseenter', onHoverStart)
        target.removeEventListener('mouseleave', onHoverEnd)
      })
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const revealTargets = root.querySelectorAll('.km-reveal')
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.15 }
    )

    revealTargets.forEach(target => observer.observe(target))

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const cleanups = []
    const stepItems = root.querySelectorAll('.km-step')

    stepItems.forEach(step => {
      const numberElement = step.querySelector('.km-step__num')
      if (!numberElement) return

      const finalNum = Number(numberElement.getAttribute('data-final'))
      let intervalId

      const onEnter = () => {
        window.clearInterval(intervalId)
        let value = 0

        intervalId = window.setInterval(() => {
          value += 1
          numberElement.textContent = String(value).padStart(2, '0')
          if (value >= finalNum) {
            numberElement.textContent = String(finalNum).padStart(2, '0')
            window.clearInterval(intervalId)
          }
        }, 40)
      }

      const onLeave = () => {
        window.clearInterval(intervalId)
        numberElement.textContent = String(finalNum).padStart(2, '0')
      }

      step.addEventListener('mouseenter', onEnter)
      step.addEventListener('mouseleave', onLeave)

      cleanups.push(() => {
        window.clearInterval(intervalId)
        step.removeEventListener('mouseenter', onEnter)
        step.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const cards = root.querySelectorAll('.km-component-card')
    const cleanups = []

    cards.forEach(card => {
      const onMove = event => {
        const rect = card.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const rotateX = ((event.clientY - centerY) / rect.height) * -6
        const rotateY = ((event.clientX - centerX) / rect.width) * 6
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
      }

      const onEnter = () => {
        card.style.transition = 'transform 0.1s ease'
      }

      const onLeave = () => {
        card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)'
        card.style.transition = 'transform 0.5s ease'
      }

      card.addEventListener('mousemove', onMove)
      card.addEventListener('mouseenter', onEnter)
      card.addEventListener('mouseleave', onLeave)

      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove)
        card.removeEventListener('mouseenter', onEnter)
        card.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [])

  const handleBack = event => {
    event.preventDefault()
    if (isLeaving) return

    setIsLeaving(true)
    window.setTimeout(() => {
      navigate('/')
    }, 220)
  }

  return (
    <div ref={rootRef} className={`knowmore-page${isLeaving ? ' knowmore-page--exit' : ''}`}>
      {createPortal(
        <>
          <div className="km-cursor-glow" ref={cursorGlowRef} />
          <div className="km-cursor-dot" ref={cursorDotRef} />
        </>,
        document.body
      )}

      <nav className={`km-nav${isScrolled ? ' km-nav--scrolled' : ''}`}>
        <button type="button" className="km-nav__back" onClick={handleBack}>
          <span aria-hidden="true">&larr;</span> Back
        </button>

        <Link to="/" className="km-nav__logo">
          <svg className="km-logo__icon" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="20" stroke="#c8c8c8" strokeWidth="2.4" />
            <path d="M7 14 Q16 20 18 36" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M3 24 Q14 18 38 26" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M26 3 Q20 16 30 38" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
          <span className="km-logo__text">Dribble</span>
        </Link>

        <div className="km-nav__progress" style={{ width: `${scrollProgress}%` }} />
      </nav>

      <main className="km-main">
        <section className="km-hero">
          <p className="km-hero__tag">{taglineText}</p>
          <h1 className="km-hero__title">
            How We
            <br />
            Built <em>Dribble</em>
          </h1>

          <div className="km-hero__divider" />

          <div className="km-hero__body">
            <div>
              <p>
                <strong>Dribble</strong> is an end-to-end AI interview coaching system engineered to listen, understand,
                and evaluate spoken answers like a human interviewer, with the consistency of a machine pipeline.
              </p>
              <p>
                The flow begins the moment you record audio. Your voice is captured and transcribed with{' '}
                <strong>OpenAI Whisper</strong>, designed to handle accents, pauses, and natural speaking patterns with high
                accuracy.
              </p>
            </div>
            <div>
              <p>
                Once transcribed, text moves through two analysis engines. A trained{' '}
                <strong>fluency model</strong> scores filler words, speaking pace, and coherence, while a{' '}
                <strong>large language model</strong> evaluates clarity, relevance, depth, and confidence.
              </p>
              <p>
                These outputs are merged into a clean <strong>feedback report</strong> with actionable sections so you know
                exactly what to improve after every practice session.
              </p>
            </div>
          </div>
        </section>

        <section className="km-pipeline">
          <p className="km-section__label">The Pipeline</p>
          <div className="km-pipeline__steps">
            {PIPELINE_STEPS.map((step, index) => {
              const number = String(index + 1).padStart(2, '0')
              return (
                <div key={step.title} className="km-step km-reveal">
                  <div className="km-step__num" data-final={number}>{number}</div>
                  <div className="km-step__title">{step.title}</div>
                  <p className="km-step__desc">{step.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="km-components">
          <h2 className="km-components__title">Core <span>Components</span></h2>
          <div className="km-components__grid">
            {COMPONENTS.map(component => (
              <div key={component.title} className="km-component-card km-reveal">
                <span className="km-card__tag">{component.tag}</span>
                <span className="km-card__icon">{component.icon}</span>
                <div className="km-card__title">{component.title}</div>
                <p className="km-card__desc">{component.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="km-footer-strip">
          <p>Dribble</p>
        </footer>
      </main>
    </div>
  )
}
