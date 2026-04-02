import { useEffect, useRef } from 'react'

export default function useCursorGlow(options = {}) {
  const { hoverSelector = '', onHoverChange } = options

  const glowRef = useRef(null)
  const dotRef = useRef(null)
  const mouse = useRef({ x: -999, y: -999 })
  const glow = useRef({ x: -999, y: -999 })
  const moved = useRef(false)

  useEffect(() => {
    if (dotRef.current) dotRef.current.style.display = 'none'
    if (glowRef.current) glowRef.current.style.opacity = '0'

    const onMove = event => {
      mouse.current = { x: event.clientX, y: event.clientY }

      if (!moved.current) {
        moved.current = true
        glow.current = { x: event.clientX, y: event.clientY }
        if (glowRef.current) glowRef.current.style.opacity = '1'
      }
    }

    const onMouseOver = event => {
      if (!onHoverChange || !hoverSelector) return
      const target = event.target
      if (!(target instanceof Element)) {
        onHoverChange(false)
        return
      }
      onHoverChange(Boolean(target.closest(hoverSelector)))
    }

    window.addEventListener('mousemove', onMove)
    if (onHoverChange && hoverSelector) {
      document.addEventListener('mouseover', onMouseOver)
    }

    let frameId
    const animate = () => {
      glow.current.x += (mouse.current.x - glow.current.x) * 0.08
      glow.current.y += (mouse.current.y - glow.current.y) * 0.08

      if (glowRef.current) {
        glowRef.current.style.left = `${glow.current.x}px`
        glowRef.current.style.top = `${glow.current.y}px`
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      if (onHoverChange && hoverSelector) {
        document.removeEventListener('mouseover', onMouseOver)
      }
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [hoverSelector, onHoverChange])

  return { glowRef, dotRef }
}
