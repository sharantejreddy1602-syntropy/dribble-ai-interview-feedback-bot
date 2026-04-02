/* ================================================================
   knowmore.js — Dribble "Know More" page interactions
   ================================================================ */

/* ── 1. CUSTOM CURSOR ── */
const cursorGlow = document.getElementById('cursorGlow');
const cursorDot  = document.getElementById('cursorDot');

let mouseX = 0, mouseY = 0;
let glowX  = 0, glowY  = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  // dot follows instantly
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
});

// glow lerps smoothly behind the cursor
function animateGlow() {
  glowX += (mouseX - glowX) * 0.08;
  glowY += (mouseY - glowY) * 0.08;
  cursorGlow.style.left = glowX + 'px';
  cursorGlow.style.top  = glowY + 'px';
  requestAnimationFrame(animateGlow);
}
animateGlow();

// dot scales up on interactive elements
const hoverTargets = document.querySelectorAll('a, button, .step, .component-card, .dev__link');
hoverTargets.forEach(el => {
  el.addEventListener('mouseenter', () => cursorDot.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursorDot.classList.remove('hovering'));
});


/* ── 2. NAVBAR SHRINK + SCROLL PROGRESS ── */
const navbar      = document.getElementById('navbar');
const navProgress = document.getElementById('navProgress');

window.addEventListener('scroll', () => {
  // shrink nav
  navbar.classList.toggle('scrolled', window.scrollY > 60);

  // progress bar width
  const scrollTop    = window.scrollY;
  const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
  const scrolled     = (scrollTop / docHeight) * 100;
  navProgress.style.width = scrolled + '%';
});


/* ── 3. SCROLL-TRIGGERED REVEAL (IntersectionObserver) ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // unobserve after reveal so it stays visible
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ── 4. PIPELINE STEP — NUMBER COUNT-UP ON HOVER ── */
document.querySelectorAll('.step__num').forEach(el => {
  const finalNum = parseInt(el.dataset.num, 10);

  el.closest('.step').addEventListener('mouseenter', () => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      el.textContent = String(count).padStart(2, '0');
      if (count >= finalNum) {
        clearInterval(interval);
        el.textContent = String(finalNum).padStart(2, '0');
      }
    }, 40);
  });

  el.closest('.step').addEventListener('mouseleave', () => {
    el.textContent = String(finalNum).padStart(2, '0');
  });
});


/* ── 5. COMPONENT CARD — TILT EFFECT ── */
document.querySelectorAll('.component-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect   = card.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    const rotateX = ((e.clientY - centerY) / rect.height) * -6;
    const rotateY = ((e.clientX - centerX) / rect.width)  *  6;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
    card.style.transition = 'transform 0.5s ease';
  });

  card.addEventListener('mouseenter', () => {
    card.style.transition = 'transform 0.1s ease';
  });
});


/* ── 6. HERO TITLE — LETTER-BY-LETTER SCRAMBLE ON LOAD ── */
function scrambleText(el, finalText, duration = 900) {
  const chars   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const steps   = Math.floor(duration / 40);
  let   current = 0;

  const interval = setInterval(() => {
    el.textContent = finalText
      .split('')
      .map((char, i) => {
        if (char === ' ' || char === '\n') return char;
        if (i < current) return char;
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join('');

    current += finalText.length / steps;
    if (current >= finalText.length) {
      el.textContent = finalText;
      clearInterval(interval);
    }
  }, 40);
}

// Only scramble the plain-text part of the title (not the <em> tag)
window.addEventListener('load', () => {
  setTimeout(() => {
    const tagLine = document.querySelector('.hero__tag');
    if (tagLine) scrambleText(tagLine, tagLine.textContent.trim(), 700);
  }, 400);
});


/* ── 7. SMOOTH ANCHOR FOR BACK BUTTON ── */
document.querySelector('.nav__back').addEventListener('click', e => {
  // Let Flask/browser handle it normally — no preventDefault
  // Just add a subtle page-fade-out
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity    = '0';
});