export default function ThemeSymbolPicker({ theme, onChange, className = '' }) {
  const pickerClass = `theme-symbol-picker ${theme === 'light' ? 'theme-symbol-picker--light' : ''} ${className}`.trim()

  return (
    <div className={pickerClass} role="group" aria-label="Theme selector">
      <button
        type="button"
        className={`theme-symbol-btn ${theme === 'light' ? 'is-active' : ''}`}
        onClick={() => onChange('light')}
        aria-label="Use light theme"
        aria-pressed={theme === 'light'}
        title="Light theme"
      >
        ☀
      </button>

      <button
        type="button"
        className={`theme-symbol-btn ${theme === 'dark' ? 'is-active' : ''}`}
        onClick={() => onChange('dark')}
        aria-label="Use dark theme"
        aria-pressed={theme === 'dark'}
        title="Dark theme"
      >
        🌙
      </button>
    </div>
  )
}