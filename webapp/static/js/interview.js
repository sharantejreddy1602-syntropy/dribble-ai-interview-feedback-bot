/* ================================================================
   interview.js — Dribble Interview Page
   ================================================================ */

/* ── CURSOR ── */
const cursorGlow = document.getElementById('cursorGlow');
const cursorDot  = document.getElementById('cursorDot');
let mouseX=0,mouseY=0,glowX=0,glowY=0;
document.addEventListener('mousemove',e=>{
  mouseX=e.clientX; mouseY=e.clientY;
  cursorDot.style.left=mouseX+'px'; cursorDot.style.top=mouseY+'px';
});
(function anim(){glowX+=(mouseX-glowX)*0.08;glowY+=(mouseY-glowY)*0.08;
  cursorGlow.style.left=glowX+'px';cursorGlow.style.top=glowY+'px';requestAnimationFrame(anim);})();
document.addEventListener('mouseover',e=>{
  if(e.target.matches('a,button,.cat-card,.answer-card')) cursorDot.classList.add('hovering');
  else cursorDot.classList.remove('hovering');
});

/* ── SCREEN MANAGER ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('screen--hidden'));
  document.getElementById(id).classList.remove('screen--hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ── STATE ── */
let selectedCategory = null;
let questions        = [];
let currentQ         = 0;
let audioBlob        = null;   // from recorder or upload
let mediaRecorder    = null;
let recordChunks     = [];
let recordTimer      = null;
let recordSeconds    = 0;

/* ════════════════════════════
   STEP 1 — CATEGORY SELECTION
════════════════════════════ */
const btnBegin = document.getElementById('btnBegin');
const btnBeginText = document.getElementById('btnBeginText');

document.querySelectorAll('.cat-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedCategory = card.dataset.cat;
    btnBegin.disabled = false;
    btnBeginText.textContent = `Begin ${selectedCategory} Interview →`;
  });
});

btnBegin.addEventListener('click', async () => {
  showScreen('screenLoading');
  await generateQuestions(selectedCategory);
});

/* ════════════════════════════
   GEMINI QUESTION GENERATION
════════════════════════════ */
async function generateQuestions(category) {
  try {
    const res  = await fetch('/generate_questions', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ category })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    questions = data.questions;
    currentQ  = 0;
    renderQuestion();
    showScreen('screenQuestion');
  } catch(err) {
    alert('Failed to generate questions: ' + err.message + '\nCheck your GEMINI_API_KEY.');
    showScreen('screenCategory');
  }
}

/* ════════════════════════════
   RENDER QUESTION
════════════════════════════ */
function renderQuestion() {
  const q = questions[currentQ];
  document.getElementById('qCategory').textContent   = selectedCategory;
  document.getElementById('qNum').textContent        = String(currentQ+1).padStart(2,'0');
  document.getElementById('qText').textContent       = q;
  document.getElementById('progressLabel').textContent = `Question ${currentQ+1} / ${questions.length}`;
  document.getElementById('progressFill').style.width  = `${((currentQ+1)/questions.length)*100}%`;

  // Reset inputs
  audioBlob = null;
  document.getElementById('btnSubmit').disabled = true;
  document.getElementById('btnSubmitText').textContent = 'Submit Answer';
  document.getElementById('uploadLabel').textContent = 'Choose file';
  document.getElementById('uploadLabel').parentElement.classList.remove('has-file');
  document.getElementById('audioPreview').classList.add('screen--hidden');
  document.getElementById('audioPreview').src = '';
  document.getElementById('cardUpload').classList.remove('active-card');
  document.getElementById('cardRecord').classList.remove('active-card');
  stopRecorderCleanup();
}

/* ════════════════════════════
   UPLOAD AUDIO
════════════════════════════ */
document.getElementById('audioUpload').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  audioBlob = file;
  const label = document.getElementById('uploadLabel');
  label.textContent = file.name.length > 28 ? file.name.slice(0,25)+'…' : file.name;
  label.parentElement.classList.add('has-file');
  document.getElementById('cardUpload').classList.add('active-card');
  document.getElementById('cardRecord').classList.remove('active-card');
  document.getElementById('btnSubmit').disabled = false;

  // Show preview
  const preview = document.getElementById('audioPreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('screen--hidden');
});

/* ════════════════════════════
   RECORD AUDIO
════════════════════════════ */
const btnRecord = document.getElementById('btnRecord');
const recStatus = document.getElementById('recStatus');
const recTimer  = document.getElementById('recTimer');
const recWave   = document.getElementById('recWave');

btnRecord.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = e => { if(e.data.size>0) recordChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordChunks, { type:'audio/webm' });
      audioBlob  = blob;
      stream.getTracks().forEach(t=>t.stop());

      // Preview
      const preview = document.getElementById('audioPreview');
      preview.src = URL.createObjectURL(blob);
      preview.classList.remove('screen--hidden');

      document.getElementById('btnSubmit').disabled = false;
      document.getElementById('cardRecord').classList.add('active-card');
      recStatus.textContent = 'Recording saved ✓';
      recWave.classList.remove('animating');
    };

    mediaRecorder.start(250);
    recordSeconds = 0;
    recTimer.textContent = '00:00';
    recStatus.textContent = 'Recording… click to stop';
    btnRecord.classList.add('recording');
    recWave.classList.add('animating');
    document.getElementById('cardRecord').classList.add('active-card');
    document.getElementById('cardUpload').classList.remove('active-card');

    recordTimer = setInterval(() => {
      recordSeconds++;
      const m = String(Math.floor(recordSeconds/60)).padStart(2,'0');
      const s = String(recordSeconds%60).padStart(2,'0');
      recTimer.textContent = `${m}:${s}`;
    }, 1000);

  } catch(err) {
    alert('Microphone access denied. Please allow microphone and try again.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  clearInterval(recordTimer);
  btnRecord.classList.remove('recording');
}

function stopRecorderCleanup() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  clearInterval(recordTimer);
  btnRecord.classList.remove('recording');
  recStatus.textContent = 'Click mic to start';
  recTimer.textContent  = '00:00';
  recWave.classList.remove('animating');
}

/* ════════════════════════════
   SUBMIT ANSWER
════════════════════════════ */
document.getElementById('btnSubmit').addEventListener('click', async () => {
  if (!audioBlob) return;
  showScreen('screenAnalyzing');
  animateAnalysisSteps();

  const formData = new FormData();
  const filename  = audioBlob.name || 'recording.webm';
  formData.append('audio',     audioBlob, filename);
  formData.append('category',  selectedCategory);
  formData.append('q_index',   currentQ);
  formData.append('question',  questions[currentQ]);

  try {
    const res  = await fetch('/submit_answer', {
      method: 'POST',
      body:   formData
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');
    renderResult(data);
    showScreen('screenResult');
  } catch(err) {
    alert('Analysis failed: ' + err.message);
    showScreen('screenQuestion');
  }
});

function animateAnalysisSteps() {
  const steps  = ['step1','step2','step3'];
  const labels = [
    'Transcribing your audio with Whisper…',
    'Scoring fluency with ML model…',
    'Generating AI feedback with LLM…'
  ];
  steps.forEach(id => {
    document.getElementById(id).classList.remove('active','done');
  });
  document.getElementById('analyzingLabel').textContent = labels[0];
  let i = 0;
  const tick = setInterval(() => {
    if (i > 0) document.getElementById(steps[i-1]).classList.replace('active','done');
    if (i < steps.length) {
      document.getElementById(steps[i]).classList.add('active');
      document.getElementById('analyzingLabel').textContent = labels[i];
      i++;
    } else {
      clearInterval(tick);
    }
  }, 1800);
}


/* ════════════════════════════
   SEMANTIC FEEDBACK RENDERER
   Detects sections: Overall Rating / Strengths / Weaknesses / Suggestions
   and renders each as a distinct styled card
════════════════════════════ */
function parseFeedback(md) {
  if (!md) return '<div class="fb-empty">No feedback available.</div>';

  // ── 1. Strip horizontal rules (---) ──
  const cleaned = md.replace(/^-{3,}\s*$/gm, '').trim();
  const lines   = cleaned.split('\n');

  // ── 2. Section definitions ──
  const SECTION_MAP = [
    { pattern: /overall\s*rating/i,          icon: '⭐', cls: 'rating',      title: 'Overall Rating'        },
    { pattern: /strength/i,                   icon: '✅', cls: 'strengths',   title: 'Strengths'             },
    { pattern: /weakness|weakness/i,          icon: '⚠️', cls: 'weaknesses',  title: 'Weaknesses'            },
    { pattern: /suggestion|improv/i,          icon: '🚀', cls: 'suggestions', title: 'Suggestions to Improve'},
  ];

  // ── 3. Parse into sections ──
  const sections  = [];   // { cls, icon, title, rawLines[] }
  let   intro     = [];   // lines before first section
  let   current   = null;

  function detectSection(line) {
    // Match bold heading like **Strengths:** or numbered 1. **Strengths:**
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
      // Save current if any
      if (current) sections.push(current);
      else if (intro.length) { /* keep intro */ }

      current = { cls: sec.cls, icon: sec.icon, title: sec.title, rawLines: [] };
      return;
    }

    if (current) {
      current.rawLines.push(line);
    } else {
      intro.push(line);
    }
  });

  if (current) sections.push(current);

  // ── 4. If no sections detected fall back to plain render ──
  if (sections.length === 0) return plainMarkdown(cleaned);

  // ── 5. Build HTML ──
  let html = '';

  // Intro paragraph (e.g. "Here's an evaluation…")
  const introText = intro.join(' ').replace(/\*\*/g, '').trim();
  if (introText && introText.length > 4) {
    html += `<p class="fb-intro">${fmt(introText)}</p>`;
  }

  // Section cards
  sections.forEach(sec => {
    // Extract rating number for the rating card
    let ratingNum = null;
    if (sec.cls === 'rating') {
      const m = sec.rawLines.join(' ').match(/(\d[\d.]*)\s*\/\s*10/);
      if (!m) {
        // Rating might be inline in the header line itself
        const header = lines.find(l => detectSection(l) && detectSection(l).cls === 'rating');
        if (header) {
          const m2 = header.match(/(\d[\d.]*)\s*\/\s*10/);
          if (m2) ratingNum = m2[1];
        }
      } else {
        ratingNum = m[1];
      }
    }

    const items = parseItems(sec.rawLines);

    html += `<div class="fb-section fb-section--${sec.cls}">`;
    html += `<div class="fb-section__hdr">
               <span class="fb-section__icon">${sec.icon}</span>
               <span class="fb-section__title">${sec.title}</span>
             </div>`;
    html += `<div class="fb-section__body">`;

    if (sec.cls === 'rating' && ratingNum) {
      html += `<div class="fb-rating">
                 <span class="fb-rating__num">${ratingNum}</span>
                 <span class="fb-rating__denom">/10</span>
                 <span class="fb-rating__bar">
                   <span class="fb-rating__fill" style="width:${Math.min(parseFloat(ratingNum)/10*100,100)}%"></span>
                 </span>
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
      // Fallback: plain text lines
      sec.rawLines.filter(l => l.trim()).forEach(l => {
        html += `<p class="fb-line">${fmt(l)}</p>`;
      });
    }

    html += `</div></div>`;
  });

  return html;
}

/* Extract bullet/numbered items from a block of lines */
function parseItems(lines) {
  const items = [];
  let   current = '';

  lines.forEach(raw => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (current.trim()) { items.push(current.trim()); current = ''; }
      return;
    }
    // New bullet / numbered item
    if (/^[\*\-]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (current.trim()) items.push(current.trim());
      current = line.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '');
    } else {
      // Continuation of previous item
      current += ' ' + line.trim();
    }
  });
  if (current.trim()) items.push(current.trim());
  return items.filter(i => i.length > 2);
}

/* Inline formatting: **bold** *italic* `code` */
function fmt(text) {
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/`(.+?)`/g, '<code class="fb-code">$1</code>');
  return text;
}

/* Plain fallback for unparsed structures */
function plainMarkdown(md) {
  return md.split('\n').map(l => `<p class="fb-line">${fmt(l.trimEnd())}</p>`).join('');
}

/* Legacy alias used elsewhere */
function parseMarkdown(md) { return parseFeedback(md); }
function inlineFormat(t)    { return fmt(t); }


/* ════════════════════════════
   RENDER RESULT
════════════════════════════ */
function renderResult(data) {
  document.getElementById('resultQNum').textContent = `Question ${currentQ+1} of ${questions.length} — Result`;

  // ── Fluency score & badge ──
  const score = data.fluency_score ?? '—';
  const label = (data.fluency_label || 'Unknown').toLowerCase().replace(/\s+/g, '-');
  document.getElementById('resultScore').textContent = typeof score === 'number' ? score + '/10' : score;
  const badge = document.getElementById('resultBadge');
  badge.textContent = data.fluency_label || '—';
  badge.className   = 'result-badge ' + label;

  // ── Transcript ──
  document.getElementById('resultTranscript').textContent = data.transcript || '—';

  // ── Speech Metrics Grid ──
  const wps      = data.speaking_rate_wps  != null ? data.speaking_rate_wps  : null;
  const wpm      = wps != null ? Math.round(wps * 60) : null;
  const dur      = data.duration_sec       != null ? data.duration_sec       : null;
  const wc       = data.word_count         != null ? data.word_count         : null;
  const tf       = data.total_fillers      != null ? data.total_fillers      : null;
  const uwr      = data.unique_word_ratio  != null ? Math.round(data.unique_word_ratio * 100) : null;
  const awl      = data.avg_word_length    != null ? data.avg_word_length    : null;
  const sc       = data.sentence_count     != null ? data.sentence_count     : null;
  const fillerPct = (wc && tf != null) ? ((tf / wc) * 100).toFixed(1) : null;

  // ideal ranges for colour coding
  const metrics = [
    {
      icon: '⏱️', label: 'Duration',
      value: dur != null ? dur + 's' : '—',
      sub: dur != null ? (dur < 15 ? 'Short answer' : dur > 120 ? 'Lengthy answer' : 'Good length') : '',
      status: dur != null ? (dur >= 20 && dur <= 120 ? 'good' : dur >= 10 ? 'avg' : 'poor') : 'neutral'
    },
    {
      icon: '💬', label: 'Word Count',
      value: wc != null ? wc : '—',
      sub: wc != null ? (wc < 40 ? 'Too brief' : wc > 250 ? 'Very detailed' : 'Good range') : '',
      status: wc != null ? (wc >= 60 && wc <= 220 ? 'good' : wc >= 30 ? 'avg' : 'poor') : 'neutral'
    },
    {
      icon: '🚀', label: 'Speaking Rate',
      value: wpm != null ? wpm + ' wpm' : '—',
      sub: wpm != null ? (wpm < 100 ? 'Too slow' : wpm > 180 ? 'Too fast' : 'Ideal pace') : '',
      status: wpm != null ? (wpm >= 110 && wpm <= 170 ? 'good' : wpm >= 80 ? 'avg' : 'poor') : 'neutral'
    },
    {
      icon: '🔁', label: 'Filler Words',
      value: tf != null ? tf : '—',
      sub: fillerPct != null ? fillerPct + '% of speech' : '',
      status: tf != null ? (tf === 0 ? 'good' : tf <= 3 ? 'avg' : 'poor') : 'neutral'
    },
    {
      icon: '📚', label: 'Vocabulary',
      value: uwr != null ? uwr + '%' : '—',
      sub: 'Unique word ratio',
      status: uwr != null ? (uwr >= 70 ? 'good' : uwr >= 50 ? 'avg' : 'poor') : 'neutral'
    },
    {
      icon: '📝', label: 'Sentences',
      value: sc != null ? sc : '—',
      sub: awl != null ? `Avg word length: ${awl}` : '',
      status: sc != null ? (sc >= 3 ? 'good' : sc >= 1 ? 'avg' : 'poor') : 'neutral'
    }
  ];

  const grid = document.getElementById('metricsGrid');
  grid.innerHTML = metrics.map(m => `
    <div class="metric-tile metric-tile--${m.status}">
      <span class="metric-tile__icon">${m.icon}</span>
      <div class="metric-tile__body">
        <span class="metric-tile__value">${m.value}</span>
        <span class="metric-tile__label">${m.label}</span>
        ${m.sub ? `<span class="metric-tile__sub">${m.sub}</span>` : ''}
      </div>
    </div>`).join('');

  // ── Filler breakdown ──
  const fillerRow  = document.getElementById('fillerRow');
  const fillerTags = document.getElementById('fillerTags');
  const breakdown  = data.filler_breakdown || {};
  const entries    = Object.entries(breakdown).filter(([,v]) => v > 0);
  if (entries.length > 0) {
    fillerTags.innerHTML = entries.map(([word, count]) =>
      `<span class="filler-tag">"${word}" <strong>${count}×</strong></span>`
    ).join('');
    fillerRow.style.display = 'flex';
  } else {
    fillerRow.style.display = 'none';
  }

  // ── AI Feedback (structured markdown) ──
  document.getElementById('resultFeedback').innerHTML = parseMarkdown(data.llm_feedback);

  // ── Next / done ──
  const btnNext   = document.getElementById('btnNext');
  const btnFinish = document.getElementById('btnFinish');
  if (currentQ + 1 < questions.length) {
    document.getElementById('btnNextText').textContent = `Next Question (${currentQ+2}/${questions.length}) →`;
    btnNext.style.display   = '';
    btnFinish.style.display = 'none';
  } else {
    btnNext.style.display   = 'none';
    btnFinish.style.display = '';
  }
}

document.getElementById('btnNext').addEventListener('click', () => {
  currentQ++;
  renderQuestion();
  showScreen('screenQuestion');
});

/* ════════════════════════════
   FADE IN/OUT
════════════════════════════ */
document.body.style.opacity='0';
document.body.style.transition='opacity 0.4s ease';
window.addEventListener('load',()=>{ document.body.style.opacity='1'; });