// ---------- elementos ----------
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');

const promptInput = document.getElementById('promptInput');
const gutter = document.getElementById('gutter');
const charCount = document.getElementById('charCount');
const evaluateBtn = document.getElementById('evaluateBtn');
const inlineError = document.getElementById('inlineError');

const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const resultState = document.getElementById('resultState');
const errorState = document.getElementById('errorState');
const errorDetail = document.getElementById('errorDetail');

const gaugeFill = document.getElementById('gaugeFill');
const needleGroup = document.getElementById('needleGroup');
const scoreValue = document.getElementById('scoreValue');
const criteriaList = document.getElementById('criteriaList');
const weakList = document.getElementById('weakList');
const improvedPrompt = document.getElementById('improvedPrompt');
const copyBtn = document.getElementById('copyBtn');
const copiedMsg = document.getElementById('copiedMsg');

const MAX_CHARS = 2000;

async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error();
    const data = await res.json();
    statusBadge.className = 'status-badge status-ok';
    statusText.textContent = 'servidor local ok · ' + (data.model || 'modelo configurado');
  } catch (_) {
    statusBadge.className = 'status-badge status-error';
    statusText.textContent = 'servidor local não encontrado — rode "npm start"';
  }
}
checkStatus();

function updateGutter() {
  const lines = promptInput.value.split('\n').length;
  let out = '';
  for (let i = 1; i <= lines; i++) out += i + '\n';
  gutter.textContent = out.trim();

  const len = promptInput.value.length;
  charCount.textContent = len + ' / ' + MAX_CHARS + ' caracteres';
  charCount.classList.toggle('char-count-over', len > MAX_CHARS);
}
promptInput.addEventListener('input', updateGutter);
promptInput.addEventListener('scroll', () => { gutter.scrollTop = promptInput.scrollTop; });
updateGutter();

async function evaluatePrompt(promptText) {
  const response = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptText })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = data?.erro || ('Erro ' + response.status + ' ao consultar a API local.');
    const detalhe = data?.detalhe ? ' (' + String(data.detalhe).slice(0, 200) + ')' : '';
    throw new Error(msg + detalhe);
  }

  if (!data?.resposta) {
    throw new Error('A API local não retornou nenhuma resposta.');
  }

  return parseModelJson(data.resposta);
}

function parseModelJson(content) {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (_) { }
    }
    throw new Error('Não foi possível interpretar a resposta do modelo como JSON.');
  }
}

function showState(state) {
  emptyState.hidden = state !== 'empty';
  loadingState.hidden = state !== 'loading';
  resultState.hidden = state !== 'result';
  errorState.hidden = state !== 'error';
}

function setInlineError(message) {
  if (!message) {
    inlineError.hidden = true;
    inlineError.textContent = '';
    return;
  }
  inlineError.hidden = false;
  inlineError.textContent = message;
}

let gaugeLength = null;
function getGaugeLength() {
  if (gaugeLength === null) gaugeLength = gaugeFill.getTotalLength();
  return gaugeLength;
}

function renderScore(notaRaw) {
  const nota = Math.max(0, Math.min(10, Number(notaRaw) || 0));
  const pct = nota / 10;
  const len = getGaugeLength();

  gaugeFill.style.strokeDasharray = len;
  gaugeFill.style.strokeDashoffset = len * (1 - pct);

  const angle = -90 + pct * 180;
  needleGroup.style.transform = 'rotate(' + angle + 'deg)';

  let color = 'var(--red)';
  if (nota >= 7) color = 'var(--green)';
  else if (nota >= 4) color = 'var(--amber)';
  gaugeFill.style.stroke = color;

  scoreValue.textContent = (Number.isInteger(nota) ? nota : nota.toFixed(1));
  scoreValue.style.color = color;
}

function renderResult(result) {
  renderScore(result.nota);

  criteriaList.innerHTML = '';
  (result.criterios || []).forEach(c => {
    const li = document.createElement('li');
    li.className = 'criteria-item ' + (c.atende ? 'ok' : 'bad');
    li.innerHTML = `
      <span class="criteria-mark">${c.atende ? '✓' : '✗'}</span>
      <span class="criteria-text"><strong>${escapeHtml(c.nome || '')}</strong><span>${escapeHtml(c.comentario || '')}</span></span>
    `;
    criteriaList.appendChild(li);
  });

  weakList.innerHTML = '';
  (result.pontos_fracos || []).forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    weakList.appendChild(li);
  });

  improvedPrompt.textContent = result.prompt_melhorado || '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

evaluateBtn.addEventListener('click', async () => {
  const promptText = promptInput.value.trim();

  if (!promptText) {
    setInlineError('Cole um prompt antes de avaliar.');
    promptInput.focus();
    return;
  }
  if (promptText.length > MAX_CHARS) {
    setInlineError('Seu prompt tem ' + promptText.length + ' caracteres. O limite é ' + MAX_CHARS + '.');
    return;
  }
  setInlineError(null);

  evaluateBtn.disabled = true;
  showState('loading');

  try {
    const result = await evaluatePrompt(promptText);
    renderResult(result);
    showState('result');
  } catch (err) {
    errorDetail.textContent = err.message || 'Erro desconhecido.';
    showState('error');
  } finally {
    evaluateBtn.disabled = false;
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(improvedPrompt.textContent);
    copiedMsg.hidden = false;
    setTimeout(() => { copiedMsg.hidden = true; }, 1500);
  } catch (_) {
    const range = document.createRange();
    range.selectNodeContents(improvedPrompt);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
});

showState('empty');
