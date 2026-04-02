/* ================================================================
   latency.js — Dribble Latency Benchmark Page
   ================================================================ */

/* ── CURSOR GLOW ── */
const cursorGlow = document.getElementById('cursorGlow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

/* ── ELEMENTS ── */
const dropZone   = document.getElementById('dropZone');
const audioFile  = document.getElementById('audioFile');
const filePreview= document.getElementById('filePreview');
const fileName   = document.getElementById('fileName');
const fileSize   = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const btnRun     = document.getElementById('btnRun');
const btnRunText = document.getElementById('btnRunText');
const benchForm  = document.getElementById('benchForm');

/* ── FILE SIZE FORMATTER ── */
function fmtSize(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* ── SET FILE ── */
function setFile(file) {
  if (!file) return;
  fileName.textContent = file.name;
  fileSize.textContent = fmtSize(file.size);
  filePreview.style.display = 'flex';
  dropZone.classList.add('has-file');
  btnRun.disabled = false;
  btnRunText.textContent = 'Run Benchmark (10 Runs)';
}

/* ── CLEAR FILE ── */
function clearFile() {
  audioFile.value = '';
  filePreview.style.display = 'none';
  dropZone.classList.remove('has-file');
  btnRun.disabled = true;
  btnRunText.textContent = 'Select a file to run benchmark';
}

/* ── FILE INPUT CHANGE ── */
audioFile.addEventListener('change', () => {
  if (audioFile.files[0]) setFile(audioFile.files[0]);
});

/* ── REMOVE FILE ── */
removeFile.addEventListener('click', clearFile);

/* ── DRAG AND DROP ── */
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  // Inject into file input
  const dt = new DataTransfer();
  dt.items.add(file);
  audioFile.files = dt.files;
  setFile(file);
});

/* ── FORM SUBMIT ── */
benchForm.addEventListener('submit', () => {
  btnRun.disabled = true;
  btnRun.classList.add('running');
  btnRunText.textContent = 'Running 10 benchmark runs… please wait';
});

/* ── FADE IN ── */
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.35s ease';
window.addEventListener('load', () => { document.body.style.opacity = '1'; });