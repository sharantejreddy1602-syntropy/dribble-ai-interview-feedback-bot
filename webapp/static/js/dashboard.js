/* ================================================================
   dashboard.js — Dribble Dashboard Interactions
   ================================================================ */

/* ── 1. CUSTOM CURSOR ── */
const cursorGlow = document.getElementById('cursorGlow');
const cursorDot  = document.getElementById('cursorDot');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
});

(function animateGlow() {
  glowX += (mouseX - glowX) * 0.08;
  glowY += (mouseY - glowY) * 0.08;
  cursorGlow.style.left = glowX + 'px';
  cursorGlow.style.top  = glowY + 'px';
  requestAnimationFrame(animateGlow);
})();

document.querySelectorAll('a, button, .category-card, .history-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursorDot.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursorDot.classList.remove('hovering'));
});


/* ── 2. NAVBAR SHRINK + SCROLL PROGRESS ── */
const navbar      = document.getElementById('navbar');
const navProgress = document.getElementById('navProgress');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
  navProgress.style.width = pct + '%';
}, { passive: true });


/* ── 3. SESSION COUNTDOWN TIMER ── */
const TOKEN_SECONDS  = 300; // 5 minutes — matches Flask TOKEN_EXPIRY_SECONDS
const timerEl        = document.getElementById('tokenTimer');
const tokenBar       = document.getElementById('tokenBar');
let   secondsLeft    = TOKEN_SECONDS;

function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function tickTimer() {
  timerEl.textContent = formatTime(secondsLeft);

  tokenBar.classList.remove('expiring', 'critical');
  if (secondsLeft <= 60)  tokenBar.classList.add('critical');
  else if (secondsLeft <= 120) tokenBar.classList.add('expiring');

  if (secondsLeft <= 0) {
    clearInterval(timerInterval);
    timerEl.textContent = '00:00';
    // Redirect to logout when expired (matches Flask behaviour)
    window.location.href = '/logout';
    return;
  }
  secondsLeft--;
}

timerEl.textContent = formatTime(secondsLeft);
const timerInterval = setInterval(tickTimer, 1000);


/* ── 4. SCROLL-TRIGGERED REVEAL ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


/* ── 5. CATEGORY CARD — UPDATE START BUTTON URL ── */
const btnStart       = document.getElementById('btnStart');
const categoryCards  = document.querySelectorAll('.category-card');
let   activeCategory = null;

categoryCards.forEach(card => {
  card.addEventListener('click', e => {
    e.preventDefault();
    const cat = card.dataset.cat;

    // Toggle active state
    categoryCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    activeCategory = cat;

    // Update the big Start button destination
    btnStart.href = `/interview?category=${cat}`;

    // Briefly animate the start button
    btnStart.style.transform = 'scale(0.97)';
    setTimeout(() => { btnStart.style.transform = ''; }, 150);
  });
});


/* ── 6. STAT NUMBER COUNT-UP ANIMATION ── */
function countUp(el, target, duration = 1000) {
  let start = 0;
  const step = target / (duration / 16);
  const interval = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.floor(start);
    if (start >= target) clearInterval(interval);
  }, 16);
}

// Trigger count-up when stats come into view
const statNums = document.querySelectorAll('.welcome-stat__num');
const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const target = parseInt(entry.target.textContent, 10);
      if (!isNaN(target) && target > 0) countUp(entry.target, target, 800);
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

statNums.forEach(el => statsObserver.observe(el));


/* ── 7. HISTORY CARD — STAGGERED ENTRANCE ── */
document.querySelectorAll('.history-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.08}s`;
});


/* ── 8. FLASH MESSAGE AUTO-DISMISS ── */
const flashMsg = document.getElementById('flashMsg');
if (flashMsg) {
  setTimeout(() => {
    flashMsg.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    flashMsg.style.opacity    = '0';
    flashMsg.style.transform  = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => flashMsg.remove(), 500);
  }, 4000);
}


/* ── 9. PAGE FADE-IN ── */
document.body.style.opacity    = '0';
document.body.style.transition = 'opacity 0.4s ease';
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});


/* ── 10. PAGE FADE-OUT ON NAVIGATION ── */
document.querySelectorAll('a[href]:not([target])').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
    e.preventDefault();
    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity    = '0';
    setTimeout(() => { window.location.href = href; }, 260);
  });
});