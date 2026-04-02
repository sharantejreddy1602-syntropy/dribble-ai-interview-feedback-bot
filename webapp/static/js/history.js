/* ================================================================
   history.js — Dribble History Page
   ================================================================ */

/* ── CURSOR GLOW ── */
const cursorGlow = document.getElementById('cursorGlow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

/* ── FILTER + SEARCH STATE ── */
let activeFilter  = 'all';
let searchQuery   = '';

const rows        = document.querySelectorAll('.history-row');
const emptyFilter = document.getElementById('emptyFilter');
const filterBtns  = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');

/* ── APPLY FILTERS ── */
function applyFilters() {
  let visibleCount = 0;

  rows.forEach(row => {
    const cat      = (row.dataset.category || '').toLowerCase();
    const question = (row.dataset.question  || '').toLowerCase();
    const q        = searchQuery.toLowerCase().trim();

    const matchesCat    = activeFilter === 'all' || cat === activeFilter.toLowerCase();
    const matchesSearch = q === '' || question.includes(q);

    if (matchesCat && matchesSearch) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  // Toggle empty state
  if (emptyFilter) {
    emptyFilter.style.display = visibleCount === 0 ? 'flex' : 'none';
  }
}

/* ── CATEGORY FILTER BUTTONS ── */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

/* ── LIVE SEARCH ── */
if (searchInput) {
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    applyFilters();
  });
}

/* ── ROW HOVER: whole row is clickable ── */
rows.forEach(row => {
  const link = row.querySelector('.btn-view');
  if (!link) return;

  row.style.cursor = 'pointer';
  row.addEventListener('click', e => {
    // Don't double-fire if they clicked the button itself
    if (e.target.closest('.btn-view')) return;
    link.click();
  });
});

/* ── FADE IN on load ── */
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.35s ease';
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});