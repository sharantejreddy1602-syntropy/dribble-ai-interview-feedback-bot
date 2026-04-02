import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './LoginPage.module.css'
import useCursorGlow from '../hooks/useCursorGlow'

/* ══════════════════════════════════════
   DRIBBLE SVG ICON
══════════════════════════════════════ */
function DribbleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" stroke="#c8c8c8" strokeWidth="2.4" />
      <path d="M7 14 Q16 20 18 36" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M3 24 Q14 18 38 26" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M26 3 Q20 16 30 38" stroke="#c8c8c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ══════════════════════════════════════
   HOOK — TYPING INTO FIELD (demo cards)
══════════════════════════════════════ */
let typingIntervals = []

function typeIntoField(setter, text, onStep, onDone) {
  // Clear any existing typing intervals
  typingIntervals.forEach(interval => clearInterval(interval))
  typingIntervals = []

  let nextValue = ''
  setter('')
  onStep?.('')

  const interval = setInterval(() => {
    if (nextValue.length < text.length) {
      nextValue += text[nextValue.length]
      setter(nextValue)
      onStep?.(nextValue)
    }

    if (nextValue.length >= text.length) {
      clearInterval(interval)
      typingIntervals = typingIntervals.filter(id => id !== interval)
      onDone?.()
    }
  }, 60)

  typingIntervals.push(interval)
  return interval
}

function runFieldValidation(value, setError, setValid, minLength, message) {
  if (value.length === 0) {
    setError('')
    setValid(false)
  } else if (value.length < minLength) {
    setError(message)
    setValid(false)
  } else {
    setError('')
    setValid(true)
  }
}

/* ══════════════════════════════════════
   COMPONENT — NAVBAR
══════════════════════════════════════ */
function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.navLogo}>
        <DribbleIcon className={styles.logoIcon} />
        <span className={styles.logoText}>Dribble</span>
      </Link>
    </nav>
  )
}

/* ══════════════════════════════════════
   COMPONENT — FLASH MESSAGE
══════════════════════════════════════ */
function FlashMessage({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`${styles.flash} ${styles[`flash--${type}`]}`}>
      <span>{message}</span>
      <button className={styles.flashClose} onClick={onClose}>✕</button>
    </div>
  )
}

/* ══════════════════════════════════════
   COMPONENT — LEFT PANEL
══════════════════════════════════════ */
function LeftPanel() {
  const stats = [
    { num: '4',    label: 'Categories' },
    { num: 'AI',   label: 'Powered'    },
    { num: 'Real', label: 'Feedback'   },
  ]

  return (
    <div className={styles.panelLeft}>
      <div className={styles.panelContent}>

        <p className={styles.panelEyebrow}>AI Interview Coaching</p>

        <h1 className={styles.panelTitle}>
          Your Voice.<br />
          <span>Your Feedback.</span>
        </h1>

        <p className={styles.panelSub}>
          Record your answer. Dribble listens, analyses, and gives you structured
          feedback — fluency, clarity, confidence — in seconds.
        </p>

        <div className={styles.panelStats}>
          {stats.map((s, i) => (
            <>
              <div key={s.label} className={styles.stat}>
                <div className={styles.statNum}>{s.num}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
              {i < stats.length - 1 && (
                <div key={`d${i}`} className={styles.statDivider} />
              )}
            </>
          ))}
        </div>

        {/* Decorative animated lines */}
        <div className={styles.decorLines}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={styles.decorLine}
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>

      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   COMPONENT — INPUT FIELD
══════════════════════════════════════ */
function InputField({
  id, label, type, value, onChange, onFocus, onBlur,
  placeholder, icon, error, success, check,
  rightSlot, autoComplete, onKeyUp,
}) {
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ''} ${success ? styles.fieldSuccess : ''}`}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <div className={styles.fieldWrap}>
        <span className={styles.fieldIcon}>{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={styles.fieldInput}
        />
        {check && (
          <span className={styles.fieldCheck} style={{ color: 'var(--green)' }}>✓</span>
        )}
        {rightSlot}
      </div>
      <p className={styles.fieldError}>{error || ''}</p>
    </div>
  )
}

/* ══════════════════════════════════════
   COMPONENT — DEMO CARD
══════════════════════════════════════ */
function DemoCard({ role, user, pass, onClick }) {
  return (
    <button type="button" className={styles.demoCard} onClick={() => onClick(user, pass)}>
      <span className={styles.demoRole}>{role}</span>
      <span className={styles.demoCreds}>{user} / {pass}</span>
      <span className={styles.demoHint}>Click to fill</span>
    </button>
  )
}

/* ══════════════════════════════════════
   COMPONENT — PASSWORD STRENGTH BAR
══════════════════════════════════════ */
function PasswordStrength({ password }) {
  const getStrength = () => {
    if (!password) return 0
    if (password.length < 4) return 1
    if (password.length < 6) return 2
    return 3
  }
  const strength = getStrength()
  const labels   = ['', 'Weak', 'Fair', 'Good']
  const colours  = ['', '#ff5555', '#f0a030', '#44cc88']

  if (!password) return null

  return (
    <div className={styles.strengthWrap}>
      <div className={styles.strengthBars}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={styles.strengthBar}
            style={{ background: i <= strength ? colours[strength] : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <span className={styles.strengthLabel} style={{ color: colours[strength] }}>
        {labels[strength]}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN — LOGIN PAGE
══════════════════════════════════════ */
export default function LoginPage() {
  const { glowRef, dotRef } = useCursorGlow()
  const btnLoginRef = useRef(null)
  const navigate = useNavigate()

  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [shake,        setShake]        = useState(false)
  const [flash,        setFlash]        = useState(null)  // { type, message }
  const [focusedField, setFocusedField] = useState(null)

  const [uError, setUError] = useState('')
  const [pError, setPError] = useState('')
  const [uValid, setUValid] = useState(false)
  const [pValid, setPValid] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [activeMood, setActiveMood] = useState('focused')

  const moodHints = {
    focused: 'Best for structured answers and concise communication.',
    calm: 'Great when you want to slow down and improve clarity.',
    confident: 'Ideal for energetic delivery and assertive responses.',
  }

  useEffect(() => {
    return () => {
      typingIntervals.forEach(interval => clearInterval(interval))
      typingIntervals = []
    }
  }, [])

  const validateUsername = useCallback((val) => {
    runFieldValidation(val, setUError, setUValid, 3, 'Username must be at least 3 characters')
  }, [])

  const validatePassword = useCallback((val) => {
    runFieldValidation(val, setPError, setPValid, 6, 'Password must be at least 6 characters')
  }, [])

  // Real-time validation
  const handleUsernameChange = (e) => {
    const val = e.target.value
    setUsername(val)
    validateUsername(val)
  }

  const handlePasswordChange = (e) => {
    const val = e.target.value
    setPassword(val)
    validatePassword(val)
  }

  // Shake animation
  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }, [])

  // Form submit → authenticates with Flask and creates server session cookie
  const handleSubmit = async (e) => {
    e.preventDefault()

    let valid = true
    if (username.trim().length < 3) {
      setUError('Please enter a valid username')
      valid = false
    }
    if (password.length < 6) {
      setPError('Please enter your password')
      valid = false
    }
    if (!valid) {
      triggerShake()
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Login failed. Please try again.')
      }

      window.localStorage.setItem('username', data.username || username.trim())
      setFlash({ type: 'success', message: 'Login successful!' })
      navigate(data.redirect || '/dashboard')
    } catch (error) {
      triggerShake()
      setFlash({ type: 'error', message: error.message || 'Unable to login right now.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordKeyUp = (e) => {
    setCapsLockOn(e.getModifierState('CapsLock'))
  }

  // Demo card fill with typing animation
  const handleDemoFill = (user, pass) => {
    // Animate typing into fields
    typeIntoField(setUsername, user, validateUsername, () => {
      typeIntoField(setPassword, pass, validatePassword, () => {
        if (btnLoginRef.current) {
          btnLoginRef.current.style.transform = 'scale(1.03)'
          setTimeout(() => {
            if (btnLoginRef.current) btnLoginRef.current.style.transform = ''
          }, 200)
        }
      })
    })
  }

  // Eye icon SVGs
  const eyeOpenSVG = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
  const eyeClosedSVG = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )

  return (
    <div className={styles.page}>

      {/* Cursor */}
      <div ref={glowRef} className={styles.cursorGlow} />
      <div ref={dotRef}  className={styles.cursorDot}  />

      {/* Flash */}
      {flash && (
        <FlashMessage
          type={flash.type}
          message={flash.message}
          onClose={() => setFlash(null)}
        />
      )}

      <Navbar />

      <main className={styles.main}>

        <LeftPanel />

        {/* ── RIGHT PANEL ── */}
        <div className={styles.panelRight}>
          <div className={`${styles.loginBox} ${shake ? styles.shake : ''}`}>

            {/* Header */}
            <div className={styles.loginHeader}>
              <p className={styles.loginTag}>Welcome Back</p>
              <h2 className={styles.loginTitle}>Sign In</h2>
              <p className={styles.loginSub}>Enter your credentials to continue</p>
            </div>

            {/* Form posts to Flask /api/login */}
            <form
              method="POST"
              action="/api/login"
              onSubmit={handleSubmit}
              noValidate
            >

              {/* Username */}
              <InputField
                id="username"
                label="Username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter username"
                autoComplete="username"
                error={uError}
                success={uValid}
                check={uValid}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18"
                    style={{ color: focusedField === 'username' ? '#fff' : undefined }}>
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                }
              />

              {/* Password */}
              <InputField
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyUp={handlePasswordKeyUp}
                placeholder="Enter password"
                autoComplete="current-password"
                error={pError}
                success={pValid}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18"
                    style={{ color: focusedField === 'password' ? '#fff' : undefined }}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                }
                rightSlot={
                  <button
                    type="button"
                    className={styles.fieldToggle}
                    onClick={() => setShowPassword(v => !v)}
                    aria-label="Toggle password visibility"
                    style={{ color: showPassword ? '#fff' : undefined }}
                  >
                    {showPassword ? eyeClosedSVG : eyeOpenSVG}
                  </button>
                }
              />

              <div className={styles.formUtilities}>
                <label className={styles.rememberLabel}>
                  <input
                    type="checkbox"
                    className={styles.rememberInput}
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className={styles.forgotButton}
                  onClick={() => setFlash({ type: 'success', message: 'Password reset will be available soon.' })}
                >
                  Forgot password?
                </button>
              </div>

              {capsLockOn && (
                <p className={styles.capsLockWarning}>Caps Lock is on</p>
              )}

              {/* Password strength bar */}
              {/* <PasswordStrength password={password} /> */}

              {/* Submit button */}
              <button
                ref={btnLoginRef}
                type="submit"
                className={`${styles.btnLogin} ${loading ? styles.btnLoading : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.btnSpinner} />
                ) : (
                  <>
                    <span className={styles.btnShimmer} />
                    <span className={styles.btnText}>Sign In</span>
                    <span className={styles.btnArrow}>→</span>
                  </>
                )}
              </button>

            </form>

            {/* Demo credentials */}
            <div className={styles.demo}>
              <p className={styles.demoLabel}>
                <span className={styles.demoLine} />
                Quick Demo Access
                <span className={styles.demoLine} />
              </p>
              <div className={styles.demoCards}>
                <DemoCard role="User"  user="user"  pass="user123"  onClick={handleDemoFill} />
                <DemoCard role="Admin" user="admin" pass="admin123" onClick={handleDemoFill} />
              </div>

              <div className={styles.interactivePanel}>
                <div className={styles.interactiveHead}>
                  <p className={styles.interactiveTitle}>Practice Style</p>
                  <button
                    type="button"
                    className={styles.tipsToggle}
                    onClick={() => setShowTips(v => !v)}
                  >
                    {showTips ? 'Hide tips' : 'Show tips'}
                  </button>
                </div>

                <div className={styles.moodChips}>
                  <button
                    type="button"
                    className={`${styles.moodChip} ${activeMood === 'focused' ? styles.moodChipActive : ''}`}
                    onClick={() => setActiveMood('focused')}
                  >
                    Focused
                  </button>
                  <button
                    type="button"
                    className={`${styles.moodChip} ${activeMood === 'calm' ? styles.moodChipActive : ''}`}
                    onClick={() => setActiveMood('calm')}
                  >
                    Calm
                  </button>
                  <button
                    type="button"
                    className={`${styles.moodChip} ${activeMood === 'confident' ? styles.moodChipActive : ''}`}
                    onClick={() => setActiveMood('confident')}
                  >
                    Confident
                  </button>
                </div>

                <p className={styles.moodHint}>{moodHints[activeMood]}</p>

                {showTips && (
                  <div className={styles.tipBox}>
                    <p>Use demo cards to auto-fill and test the login flow.</p>
                    <p>Keep Caps Lock off while typing your password.</p>
                    <p>Use the password eye icon to verify your input before submit.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </main>

      <footer className={styles.footer}>
        <p>Dribble</p>
      </footer>

    </div>
  )
}