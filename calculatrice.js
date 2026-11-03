function fmt(raw) {
  if (raw === '' || raw === '-') return raw;
  if (['Erreur', 'Infini', '-Infini'].includes(raw)) return raw;
  const trailingDot = typeof raw === 'string' && raw.endsWith('.');
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  if (Math.abs(n) > 1e12 || (Math.abs(n) < 1e-9 && n !== 0)) {
    return n.toExponential(6).replace('+', '');
  }
  return parseFloat(n.toPrecision(10)).toString() + (trailingDot ? '.' : '');
}
function sanitize(n) {
  if (!isFinite(n)) return isNaN(n) ? 'Erreur' : (n > 0 ? 'Infini' : '-Infini');
  return parseFloat(n.toPrecision(10)).toString();
}
function flashResult() {
  elResult.classList.remove('flash');
  void elResult.offsetWidth;
  elResult.classList.add('flash');
  elResult.addEventListener('animationend', () => elResult.classList.remove('flash'), { once: true });
}
function setResultSize(text) {
  elResult.classList.remove('compact', 'tiny');
  const len = (text || '').length;
  if (len > 14) elResult.classList.add('tiny');
  else if (len > 9) elResult.classList.add('compact');
}
function evaluate(tokens) {
  const toks = tokens.map(t => t === 'π' ? String(Math.PI) : t);
  let pos = 0;
  function peek() { return toks[pos]; }
  function consume() { return toks[pos++]; }
  function parseExpr() {
    let left = parseTerm();
    while (pos < toks.length && (peek() === '+' || peek() === '−')) {
      const op = consume();
      const right = parseTerm();
      if (op === '+') left += right;
      else            left -= right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (pos < toks.length && (peek() === '×' || peek() === '÷')) {
      const op = consume();
      const right = parseFactor();
      if (op === '×') left *= right;
      else            left = right === 0 ? NaN : left / right;
    }
    return left;
  }
  function parseFactor() {
    const t = peek();
    if (t === '(') {
      consume(); // '('
      const val = parseExpr();
      if (peek() === ')') consume(); // ')'
      return val;
    }
    if (t === undefined) return NaN;
    consume();
    const n = parseFloat(t);
    return isNaN(n) ? NaN : n;
  }
  return parseExpr();
}
function buildExprStr() {
  const parts = [...S.tokens];
  if (S.currentNum !== '') parts.push(S.currentNum);
  return parts.map((t, i) => {
    if (t === '(' || t === ')') return t;
    if (parts[i - 1] === '(')  return t;
    return ' ' + t;
  }).join('').trim();
}
function render(opts = {}) {
  if (opts.expressionOverride !== undefined) {
    elExpression.textContent = opts.expressionOverride || '\u00a0';
  } else {
    elExpression.textContent = buildExprStr() || '\u00a0';
  }
  let big;
  if (S.phase === 'result') {
    big = fmt(S.currentNum);
  } else {
    big = S.currentNum !== '' ? fmt(S.currentNum) : '0';
  }
  const displayed = big || '0';
  elResult.textContent = displayed;
  setResultSize(displayed);
  if (opts.showFlash) flashResult();
  const lastTok = S.tokens[S.tokens.length - 1];
  opBtns.forEach(b => {
    b.classList.toggle(
      'active-op',
      S.phase !== 'result' && b.dataset.op === lastTok && S.currentNum === ''
    );
  });
}
function pushCurrentNum() {
  if (S.currentNum !== '') {
    S.tokens.push(S.currentNum);
    S.currentNum = '';
  }
}
function doNum(val) {
  if (S.phase === 'result') {
    S.tokens     = [];
    S.currentNum = val === '.' ? '0.' : val;
    S.phase      = 'input';
    S.waitPowY   = false;
    render({ showFlash: true });
    return;
  }
  if (val === '.' && S.currentNum.includes('.')) return;
  if (S.currentNum === '0' && val !== '.') { S.currentNum = val; }
  else if (val === '.' && S.currentNum === '') { S.currentNum = '0.'; }
  else {
    if (S.currentNum.replace('-','').replace('.','').length >= 15) return;
    S.currentNum += val;
  }
  render({ showFlash: true });
}
function doOp(op) {
  if (S.phase === 'result') {
    S.tokens     = [S.currentNum];
    S.currentNum = '';
    S.phase      = 'input';
  }
  if (S.currentNum === '' && S.tokens.length > 0) {
    const last = S.tokens[S.tokens.length - 1];
    if (['+','−','×','÷'].includes(last)) {
      S.tokens[S.tokens.length - 1] = op;
      render();
      return;
    }
  }
  pushCurrentNum();
  S.tokens.push(op);
  render();
}
function doParen(val) {
  if (S.phase === 'result') {
    if (val === '(') {
      S.tokens     = [];
      S.currentNum = '';
      S.phase      = 'input';
    } else { return; }
  }
  if (val === '(') {
    if (S.currentNum !== '') {
      S.tokens.push(S.currentNum);
      S.tokens.push('×');
      S.currentNum = '';
    }
    S.tokens.push('(');
  } else {
    pushCurrentNum();
    S.tokens.push(')');
  }
  render();
}
function doConst(val) {
  if (S.phase === 'result') {
    S.tokens     = [];
    S.currentNum = '';
    S.phase      = 'input';
  }
  pushCurrentNum();
  S.tokens.push(val);
  render({ showFlash: true });
}
function doMulX(val) {
  const n = S.currentNum !== '' ? parseFloat(S.currentNum)
          : S.tokens.length > 0 ? parseFloat(S.tokens[S.tokens.length - 1])
          : NaN;
  if (isNaN(n)) return;
  const res = sanitize(n * parseFloat(val));
  if (S.currentNum === '' && S.tokens.length > 0 && !isNaN(parseFloat(S.tokens[S.tokens.length - 1]))) {
    S.tokens[S.tokens.length - 1] = res;
  } else {
    S.currentNum = res;
  }
  render({ showFlash: true });
}
function doFn(fn) {
  if (fn === 'pow') {
    const base = S.currentNum !== '' ? S.currentNum
               : (S.tokens.length > 0 && !isNaN(parseFloat(S.tokens[S.tokens.length-1]))
                  ? S.tokens.pop() : null);
    if (!base) return;
    pushCurrentNum();
    S.powYBase   = base;
    S.waitPowY   = true;
    S.tokens     = [base, '^'];
    S.currentNum = '';
    S.phase      = 'input';
    render();
    return;
  }
  const raw = S.currentNum;
  if (raw === '' || raw === 'Erreur') return;
  const x = parseFloat(raw);
  const map = {
    sin:  v => Math.sin(v),
    cos:  v => Math.cos(v),
    tan:  v => Math.tan(v),
    sqrt: v => v < 0 ? NaN : Math.sqrt(v),
    sq:   v => v * v,
    cube: v => v * v * v,
    inv:  v => v === 0 ? NaN : 1 / v,
    log:  v => v <= 0 ? NaN : Math.log10(v),
    ln:   v => v <= 0 ? NaN : Math.log(v),
  };
  if (!map[fn]) return;
  const result = sanitize(map[fn](x));
  const labels = { sin:'sin', cos:'cos', tan:'tan', sqrt:'√', sq:'²', cube:'³', inv:'1÷', log:'log', ln:'ln' };
  let exprStr;
  if (fn === 'sq')       exprStr = `(${fmt(raw)})²`;
  else if (fn === 'cube') exprStr = `(${fmt(raw)})³`;
  else if (fn === 'inv')  exprStr = `1 ÷ ${fmt(raw)}`;
  else exprStr = `${labels[fn]}(${fmt(raw)})`;
  exprStr += ' =';
  S.tokens     = [];
  S.currentNum = result;
  S.phase      = 'result';
  render({ expressionOverride: exprStr, showFlash: true });
}
function doEquals() {
  if (S.waitPowY) {
    if (S.currentNum === '') return;
    const res = sanitize(Math.pow(parseFloat(S.powYBase), parseFloat(S.currentNum)));
    const expr = `${fmt(S.powYBase)} ^ ${fmt(S.currentNum)} =`;
    S.tokens = []; S.currentNum = res; S.phase = 'result';
    S.waitPowY = false; S.powYBase = '';
    render({ expressionOverride: expr, showFlash: true });
    return;
  }
  if (S.phase !== 'input') return;
  pushCurrentNum();
  while (S.tokens.length > 0 && ['+','−','×','÷'].includes(S.tokens[S.tokens.length - 1])) {
    S.tokens.pop();
  }
  if (S.tokens.length === 0) return;
  const exprStr = buildExprStr() + ' =';
  const res = sanitize(evaluate(S.tokens));
  S.currentNum = res;
  S.tokens     = [];
  S.phase      = 'result';
  render({ expressionOverride: exprStr, showFlash: true });
}
function doAC() {
  S.tokens = []; S.currentNum = ''; S.phase = 'input';
  S.waitPowY = false; S.powYBase = '';
  render({ expressionOverride: '\u00a0' });
  flashResult();
}
function doDel() {
  if (S.phase === 'result') { doAC(); return; }
  if (S.currentNum.length > 0) {
    S.currentNum = S.currentNum.length === 1 ? '' : S.currentNum.slice(0, -1);
  } else if (S.tokens.length > 0) {
    S.tokens.pop();
  }
  render();
}
function dispatch(action, data) {
  switch (action) {
    case 'num':   doNum(data.val);   break;
    case 'op':    doOp(data.op);     break;
    case 'eq':    doEquals();         break;
    case 'ac':    doAC();             break;
    case 'del':   doDel();            break;
    case 'fn':    doFn(data.fn);     break;
    case 'const': doConst(data.val); break;
    case 'paren': doParen(data.val); break;
    case 'mulx':  doMulX(data.val);  break;
  }
}
const S = {
  tokens: [],
  currentNum: '', 
  phase: 'input', 
  waitPowY: false,
  powYBase: '',
};
const elResult     = document.getElementById('result');
const elExpression = document.getElementById('expression');
const sciGrid      = document.getElementById('sciGrid');
const tooltipBox   = document.getElementById('tooltipBox');
const modeBtns     = document.querySelectorAll('.mode-btn');
const opBtns       = document.querySelectorAll('.btn.op');
const mainGrid      = document.querySelector('.main-grid');
const displayBox    = document.querySelector('.display');
const energyPanel   = document.getElementById('energyPanel');
const energySelect  = document.getElementById('energySelect');
const energyFields  = document.getElementById('energyFields');
const energyResult  = document.getElementById('energyResult');
const energyCalcBtn = document.getElementById('energyCalcBtn');
function energyFieldHTML(id, label) {
  return `<label class="energy-label">${label}<input type="number" step="any" min="0" class="energy-input" id="${id}"></label>`;
}
function parseDureeHeures(str) {
  if (str === '' || str === null || str === undefined) return NaN;
  const parts = String(str).split('.');
  const h = parseInt(parts[0], 10);
  if (isNaN(h)) return NaN;
  if (parts.length === 1) return h;
  let mm = parts[1];
  if (mm.length === 1) mm += '0';
  if (mm.length > 2) return NaN;
  const mmNum = parseInt(mm, 10);
  if (isNaN(mmNum) || mmNum > 59) return NaN;
  return h + mmNum / 60;
}
const qLabel = { V: 'Tension U (V)', A: 'Courant I (A)', W: 'Puissance P (W)' };
const qName  = { V: 'Tension', A: 'Courant', W: 'Puissance' };
function otherOptions(first) { return ['V', 'A', 'W'].filter(o => o !== first); }
let puFirst = null, puSecond = null;
function renderPuFlow() {
  if (!puFirst) {
    energyFields.innerHTML =
      `<label class="energy-label">Je connais
        <select class="energy-input" id="ePu1">
          <option value="" disabled selected>Choisir…</option>
          <option value="V">Tension</option>
          <option value="A">Courant</option>
          <option value="W">Puissance</option>
        </select>
      </label>`;
    document.getElementById('ePu1').addEventListener('change', e => {
      puFirst = e.target.value;
      renderPuFlow();
    });
  } else if (!puSecond) {
    const opts = otherOptions(puFirst);
    energyFields.innerHTML =
      `<label class="energy-label">Et aussi
        <select class="energy-input" id="ePu2">
          <option value="" disabled selected>Choisir…</option>
          ${opts.map(o => `<option value="${o}">${qName[o]}</option>`).join('')}
        </select>
      </label>`;
    document.getElementById('ePu2').addEventListener('change', e => {
      puSecond = e.target.value;
      renderPuFlow();
    });
  } else {
    energyFields.innerHTML =
      energyFieldHTML('ePuVal1', qLabel[puFirst]) +
      energyFieldHTML('ePuVal2', qLabel[puSecond]);
  }
}
function renderEnergyFields() {
  const type = energySelect.value;
  energyResult.textContent = '';
  energyResult.classList.remove('success');
  if (type === 'power') {
    puFirst = null; puSecond = null;
    renderPuFlow();
  } else {
    energyFields.innerHTML =
      energyFieldHTML('eP2', 'Puissance P (W)') +
      energyFieldHTML('eT', 'Durée t (h, ex: 1.30 = 1h30)');
  }
}
function calcEnergy() {
  const type = energySelect.value;
  if (type === 'power') {
    if (!puFirst || !puSecond) { energyResult.textContent = 'Sélectionne les 2 grandeurs'; energyResult.classList.remove('success'); return; }
    const v1 = parseFloat(document.getElementById('ePuVal1').value);
    const v2 = parseFloat(document.getElementById('ePuVal2').value);
    if (isNaN(v1) || isNaN(v2)) { energyResult.textContent = 'Remplis les 2 champs'; energyResult.classList.remove('success'); return; }
    if (v1 < 0 || v2 < 0) { energyResult.textContent = 'Valeurs positives uniquement'; energyResult.classList.remove('success'); return; }
    const vals = {}; vals[puFirst] = v1; vals[puSecond] = v2;
    let resultText;
    if (vals.V !== undefined && vals.A !== undefined) {
      resultText = `P = ${sanitize(vals.V * vals.A)} W`;
    } else if (vals.V !== undefined && vals.W !== undefined) {
      if (vals.V === 0) { energyResult.textContent = 'Tension doit être > 0'; energyResult.classList.remove('success'); return; }
      resultText = `I = ${sanitize(vals.W / vals.V)} A`;
    } else {
      if (vals.A === 0) { energyResult.textContent = 'Courant doit être > 0'; energyResult.classList.remove('success'); return; }
      resultText = `U = ${sanitize(vals.W / vals.A)} V`;
    }
    energyResult.textContent = resultText;
    energyResult.classList.add('success');
  } else {
    const P = parseFloat(document.getElementById('eP2').value);
    const tRaw = document.getElementById('eT').value;
    const t = parseDureeHeures(tRaw);
    if (isNaN(P) || tRaw === '') { energyResult.textContent = 'Remplis les 2 champs'; energyResult.classList.remove('success'); return; }
    if (isNaN(t)) { energyResult.textContent = 'Durée invalide (minutes max 59)'; energyResult.classList.remove('success'); return; }
    if (P < 0) { energyResult.textContent = 'Valeurs positives uniquement'; energyResult.classList.remove('success'); return; }
    const Wh = P * t;
    energyResult.textContent = `E = ${sanitize(Wh)} Wh  |  ${sanitize(Wh / 1000)} kWh`;
    energyResult.classList.add('success');
  }
}
energySelect.addEventListener('change', renderEnergyFields);
energyCalcBtn.addEventListener('click', calcEnergy);
document.querySelector('.calculator').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn || !btn.dataset.action) return;
  dispatch(btn.dataset.action, btn.dataset);
});
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    sciGrid.classList.toggle('open', mode === 'scientific');
    const isEnergy = mode === 'energy';
    displayBox.classList.toggle('collapsed', isEnergy);
    mainGrid.classList.toggle('collapsed', isEnergy);
    energyPanel.classList.toggle('open', isEnergy);
    if (isEnergy) renderEnergyFields();
  });
});
let tooltipTimer = null;
sciGrid.querySelectorAll('.btn.sci').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    tooltipTimer = setTimeout(() => {
      const tip = btn.dataset.tip;
      if (!tip) return;
      tooltipBox.textContent = tip;
      const br = btn.getBoundingClientRect();
      const cr = btn.closest('.calculator').getBoundingClientRect();
      tooltipBox.style.top  = (br.bottom - cr.top + 8) + 'px';
      tooltipBox.style.left = (br.left - cr.left + br.width / 2) + 'px';
      tooltipBox.classList.add('visible');
    }, 2000);
  });
  btn.addEventListener('mouseleave', () => { clearTimeout(tooltipTimer); tooltipBox.classList.remove('visible'); });
  btn.addEventListener('click',      () => { clearTimeout(tooltipTimer); tooltipBox.classList.remove('visible'); });
});
document.addEventListener('keydown', e => {
  const modal = document.getElementById('mentionsModal');
  if (modal && modal.classList.contains('show')) {
    if (e.key === 'Escape') window.closeModal();
    e.preventDefault();
    return;
  }
  if (e.key >= '0' && e.key <= '9') { dispatch('num', { val: e.key }); return; }
  if (e.key === '.')                 { dispatch('num', { val: '.' });   return; }
  if (e.key === '+')                 { dispatch('op',  { op: '+' });    return; }
  if (e.key === '-')                 { dispatch('op',  { op: '−' });    return; }
  if (e.key === '*')                 { dispatch('op',  { op: '×' });    return; }
  if (e.key === '/') { e.preventDefault(); dispatch('op', { op: '÷' }); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    doEquals();
    return;
  }
  if (e.key === '=') { doEquals(); return; }
  if (e.key === 'Backspace') { dispatch('del', {}); return; }
  if (e.key === 'Escape') { dispatch('ac', {}); return; }
});
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById('mentionsModal');
  let _triggerEl = null;
  window.openModal = function() {
    _triggerEl = document.activeElement;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { modal.classList.add('show'); });
    document.querySelectorAll('body > *').forEach(el => {
      if (el !== modal && !el.contains(modal)) { el.setAttribute('inert', ''); el.setAttribute('data-was-inert', ''); }
    });
  }
  window.closeModal = function() {
    document.querySelectorAll('[data-was-inert]').forEach(el => { el.removeAttribute('inert'); el.removeAttribute('data-was-inert'); });
    modal.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => { modal.style.display = 'none'; }, 100);
    if (_triggerEl && typeof _triggerEl.focus === 'function') { _triggerEl.focus(); _triggerEl = null; }
  }
  closeBtn.addEventListener('click', closeModal);
});
render();
'use strict';