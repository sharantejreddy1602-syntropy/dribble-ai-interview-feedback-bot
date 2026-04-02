/* ================================================================
   admin.js — Dribble Admin Panel
   ================================================================ */

/* ── CURSOR GLOW ── */
const cursorGlow = document.getElementById('cursorGlow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

/* ── FILTER + SEARCH STATE ── */
let activeFilter = 'all';
let searchQuery  = '';

const rows        = document.querySelectorAll('.history-row');
const emptyFilter = document.getElementById('emptyFilter');
const filterBtns  = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');

/* ── APPLY FILTERS ── */
function applyFilters() {
  let visible = 0;

  rows.forEach(row => {
    const cat    = (row.dataset.category || '').toLowerCase();
    const search = (row.dataset.search   || '').toLowerCase();
    const q      = searchQuery.toLowerCase().trim();

    const matchCat    = activeFilter === 'all' || cat === activeFilter.toLowerCase();
    const matchSearch = q === '' || search.includes(q);

    if (matchCat && matchSearch) {
      row.style.display = '';
      visible++;
    } else {
      row.style.display = 'none';
    }
  });

  if (emptyFilter) {
    emptyFilter.style.display = visible === 0 ? 'flex' : 'none';
  }
}

/* ── FILTER BUTTONS ── */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});

/* ── SEARCH ── */
if (searchInput) {
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    applyFilters();
  });
}

/* ── WHOLE ROW CLICKABLE ── */
rows.forEach(row => {
  const link = row.querySelector('.btn-view');
  if (!link) return;
  row.addEventListener('click', e => {
    if (e.target.closest('.btn-view')) return;
    link.click();
  });
});

/* ── FADE IN ── */
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.35s ease';
window.addEventListener('load', () => { document.body.style.opacity = '1'; });