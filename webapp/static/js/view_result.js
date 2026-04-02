/* ================================================================
   view_result.js — Dribble Report Page
   ================================================================ */

/* ── CURSOR GLOW ── */
const cursorGlow = document.getElementById('cursorGlow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

/* ════════════════════════════════════════════════════════════════
   SEMANTIC FEEDBACK RENDERER
   Detects: Overall Rating / Strengths / Weaknesses / Suggestions
   Renders each as a distinct styled card
════════════════════════════════════════════════════════════════ */
function parseFeedback(md) {
  if (!md) return '<div class="fb-empty">No feedback available.</div>';

  const cleaned = md.replace(/^-{3,}\s*$/gm, '').trim();
  const lines   = cleaned.split('\n');

  const SECTION_MAP = [
    { pattern: /overall\s*rating/i,  icon: '⭐', cls: 'rating',      title: 'Overall Rating'         },
    { pattern: /strength/i,           icon: '✅', cls: 'strengths',   title: 'Strengths'              },
    { pattern: /weakness/i,           icon: '⚠️', cls: 'weaknesses',  title: 'Weaknesses'             },
    { pattern: /suggestion|improv/i,  icon: '🚀', cls: 'suggestions', title: 'Suggestions to Improve' },
  ];

  const sections = [];
  const intro    = [];
  let   current  = null;

  function detectSection(line) {
    const stripped = line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').replace(/:$/, '').trim();
    for (const s of SECTION_MAP) {
      if (s.pattern.test(stripped)) return s;
    }
    return null;
  }

  lines.forEach(raw => {
    const line = raw.trimEnd();
    const sec  = detectSection(line);
    if (sec) {
      if (current) sections.push(current);
      current = { cls: sec.cls, icon: sec.icon, title: sec.title, rawLines: [], headerLine: line };
      return;
    }
    if (current) current.rawLines.push(line);
    else          intro.push(line);
  });
  if (current) sections.push(current);

  if (sections.length === 0) return plainMarkdown(cleaned);

  let html = '';

  const introText = intro.join(' ').replace(/\*\*/g, '').trim();
  if (introText && introText.length > 4) {
    html += `<p class="fb-intro">${fmt(introText)}</p>`;
  }

  sections.forEach(sec => {
    let ratingNum = null;
    if (sec.cls === 'rating') {
      const src = [sec.headerLine, ...sec.rawLines].join(' ');
      const m   = src.match(/(\d[\d.]*)\s*\/\s*10/);
      if (m) ratingNum = m[1];
    }

    const items = parseItems(sec.rawLines);

    html += `<div class="fb-section fb-section--${sec.cls}">`;
    html += `<div class="fb-section__hdr">
               <span class="fb-section__icon">${sec.icon}</span>
               <span class="fb-section__title">${sec.title}</span>
             </div>`;
    html += `<div class="fb-section__body">`;

    if (sec.cls === 'rating' && ratingNum) {
      const pct = Math.min(parseFloat(ratingNum) / 10 * 100, 100);
      const col = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
      html += `<div class="fb-rating">
                 <div class="fb-rating__left">
                   <span class="fb-rating__num">${ratingNum}</span>
                   <span class="fb-rating__denom">/10</span>
                 </div>
                 <div class="fb-rating__bar-wrap">
                   <div class="fb-rating__bar">
                     <div class="fb-rating__fill" style="width:${pct}%;background:${col}"></div>
                   </div>
                   <span class="fb-rating__pct" style="color:${col}">${ratingNum}/10</span>
                 </div>
               </div>`;
    } else if (items.length > 0) {
      html += `<ul class="fb-items">`;
      items.forEach(item => {
        html += `<li class="fb-item fb-item--${sec.cls}">
                   <span class="fb-item__dot"></span>
                   <span class="fb-item__text">${fmt(item)}</span>
                 </li>`;
      });
      html += `</ul>`;
    } else {
      sec.rawLines.filter(l => l.trim()).forEach(l => {
        html += `<p class="fb-line">${fmt(l)}</p>`;
      });
    }

    html += `</div></div>`;
  });

  return html;
}

function parseItems(lines) {
  const items = [];
  let   cur   = '';
  lines.forEach(raw => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (cur.trim()) { items.push(cur.trim()); cur = ''; }
      return;
    }
    if (/^[\*\-]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (cur.trim()) items.push(cur.trim());
      cur = line.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '');
    } else {
      cur += ' ' + line.trim();
    }
  });
  if (cur.trim()) items.push(cur.trim());
  return items.filter(i => i.length > 2);
}

function fmt(text) {
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/`(.+?)`/g, '<code class="fb-code">$1</code>');
  return text;
}

function plainMarkdown(md) {
  return md.split('\n').map(l => `<p class="fb-line">${fmt(l.trimEnd())}</p>`).join('');
}

function parseMarkdown(md) { return parseFeedback(md); }

/* ── RENDER FEEDBACK ── */
(function init() {
  const feedbackEl = document.getElementById('feedbackBody');
  if (!feedbackEl) return;
  const rawFeedback = (window.REPORT_DATA && window.REPORT_DATA.llmFeedback) || '';
  feedbackEl.innerHTML = parseFeedback(rawFeedback);
})();