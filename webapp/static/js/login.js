/* ================================================================
   login.js — Dribble Login Page Interactions
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

// Enlarge dot on interactive elements
document.querySelectorAll('a, button, input, .demo__card').forEach(el => {
  el.addEventListener('mouseenter', () => cursorDot.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursorDot.classList.remove('hovering'));
});


/* ── 2. PASSWORD TOGGLE ── */
const passwordInput  = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon        = document.getElementById('eyeIcon');

const eyeOpen   = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  eyeIcon.innerHTML  = isPassword ? eyeClosed : eyeOpen;
  togglePassword.style.color = isPassword ? 'var(--white)' : 'var(--silver)';
});


/* ── 3. REAL-TIME FIELD VALIDATION ── */
const usernameInput = document.getElementById('username');
const fieldUsername = document.getElementById('fieldUsername');
const fieldPassword = document.getElementById('fieldPassword');
const errUsername   = document.getElementById('errUsername');
const errPassword   = document.getElementById('errPassword');
const checkUsername = document.getElementById('checkUsername');

function setFieldState(field, state, msg = '') {
  field.classList.remove('has-error', 'has-success');
  if (state === 'error') {
    field.classList.add('has-error');
    field.querySelector('.field__error').textContent = msg;
  } else if (state === 'success') {
    field.classList.add('has-success');
    field.querySelector('.field__error').textContent = '';
  } else {
    field.querySelector('.field__error').textContent = '';
  }
}

usernameInput.addEventListener('input', () => {
  const val = usernameInput.value.trim();
  if (val.length === 0) {
    setFieldState(fieldUsername, 'idle');
    checkUsername.textContent = '';
  } else if (val.length < 3) {
    setFieldState(fieldUsername, 'error', 'Username must be at least 3 characters');
    checkUsername.textContent = '';
  } else {
    setFieldState(fieldUsername, 'success');
    checkUsername.textContent = '✓';
    checkUsername.style.color = 'var(--green)';
  }
});

passwordInput.addEventListener('input', () => {
  const val = passwordInput.value;
  if (val.length === 0) {
    setFieldState(fieldPassword, 'idle');
  } else if (val.length < 6) {
    setFieldState(fieldPassword, 'error', 'Password must be at least 6 characters');
  } else {
    setFieldState(fieldPassword, 'success');
  }
});

// Focus label highlight
[usernameInput, passwordInput].forEach(input => {
  input.addEventListener('focus', () => {
    input.closest('.field').querySelector('.field__label').style.color = 'var(--white)';
    input.closest('.field').querySelector('.field__icon').style.color  = 'var(--white)';
  });
  input.addEventListener('blur', () => {
    input.closest('.field').querySelector('.field__label').style.color = '';
    input.closest('.field').querySelector('.field__icon').style.color  = '';
  });
});


/* ── 4. FORM SUBMIT — LOADING STATE + VALIDATION ── */
const loginForm = document.getElementById('loginForm');
const btnLogin  = document.getElementById('btnLogin');
const loginBox  = document.getElementById('loginBox');

loginForm.addEventListener('submit', e => {
  let valid = true;

  if (usernameInput.value.trim().length < 3) {
    setFieldState(fieldUsername, 'error', 'Please enter a valid username');
    valid = false;
  }
  if (passwordInput.value.length < 6) {
    setFieldState(fieldPassword, 'error', 'Please enter your password');
    valid = false;
  }

  if (!valid) {
    e.preventDefault();
    loginBox.classList.remove('shake');
    void loginBox.offsetWidth; // trigger reflow to restart animation
    loginBox.classList.add('shake');
    setTimeout(() => loginBox.classList.remove('shake'), 500);
    return;
  }

  // Show loading state
  btnLogin.classList.add('loading');
  btnLogin.disabled = true;
});


/* ── 5. DEMO CREDENTIAL CARDS — FILL & ANIMATE ── */
document.querySelectorAll('.demo__card').forEach(card => {
  card.addEventListener('click', () => {
    const user = card.dataset.user;
    const pass = card.dataset.pass;

    // Animate typing into fields
    typeIntoField(usernameInput, user, () => {
      setFieldState(fieldUsername, 'success');
      checkUsername.textContent = '✓';
      checkUsername.style.color = 'var(--green)';

      typeIntoField(passwordInput, pass, () => {
        setFieldState(fieldPassword, 'success');
        // Flash the button to signal ready
        btnLogin.style.transform = 'scale(1.03)';
        setTimeout(() => btnLogin.style.transform = '', 200);
      });
    });
  });
});

function typeIntoField(input, text, callback) {
  input.value = '';
  input.dispatchEvent(new Event('input'));
  let i = 0;
  const interval = setInterval(() => {
    input.value += text[i];
    input.dispatchEvent(new Event('input'));
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      if (typeof callback === 'function') callback();
    }
  }, 60);
}


/* ── 6. AUTO-DISMISS FLASH MESSAGES ── */
const flashMsg = document.getElementById('flashMsg');
if (flashMsg) {
  setTimeout(() => {
    flashMsg.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    flashMsg.style.opacity    = '0';
    flashMsg.style.transform  = 'translateX(-50%) translateY(-12px)';
    setTimeout(() => flashMsg.remove(), 500);
  }, 4000);
}


/* ── 7. KEYBOARD SHORTCUT — ENTER SUBMITS ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement !== btnLogin) {
    loginForm.requestSubmit();
  }
});


/* ── 8. PAGE LOAD ENTRANCE ── */
window.addEventListener('load', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});