/* ================================================================
   latency_result.js — Dribble Latency Results Page
   ================================================================ */

/* ── CURSOR GLOW ── */
const cursorGlow = document.getElementById('cursorGlow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

/* ── ANIMATE PCT BARS ON SCROLL ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    // Trigger CSS transition by setting width (already set inline via Jinja)
    entry.target.querySelectorAll('.pct-bar__fill').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { bar.style.width = w; });
      });
    });
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15 });

document.querySelectorAll('.data-table-wrap').forEach(el => observer.observe(el));

/* ── HIGHLIGHT FASTEST & SLOWEST RUN ── */
(function markExtremes() {
  const totalCells = document.querySelectorAll('.data-table--runs .td-total');
  if (!totalCells.length) return;

  let minVal = Infinity, maxVal = -Infinity;
  let minEl = null, maxEl = null;

  totalCells.forEach(cell => {
    const v = parseFloat(cell.textContent);
    if (isNaN(v)) return;
    if (v < minVal) { minVal = v; minEl = cell; }
    if (v > maxVal) { maxVal = v; maxEl = cell; }
  });

  if (minEl) {
    minEl.style.color = 'var(--green)';
    const chip = document.createElement('span');
    chip.className = 'diff-chip diff--fast';
    chip.style.marginLeft = '8px';
    chip.style.fontSize = '0.55rem';
    chip.textContent = 'FASTEST';
    minEl.appendChild(chip);
  }

  if (maxEl && maxEl !== minEl) {
    maxEl.style.color = 'var(--red)';
    const chip = document.createElement('span');
    chip.className = 'diff-chip diff--slow';
    chip.style.marginLeft = '8px';
    chip.style.fontSize = '0.55rem';
    chip.textContent = 'SLOWEST';
    maxEl.appendChild(chip);
  }
})();

/* ── FADE IN ── */
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.35s ease';
window.addEventListener('load', () => { document.body.style.opacity = '1'; });