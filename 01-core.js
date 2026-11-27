/* ======================================================================
 * 2026 Electrical Design Guide — application script
 * Sections: 1 core utilities · 2 engineering data · 3 modules · 4 calculator UI
 *           5 load balancer · 6 views & router · 7 search · 8 PWA features
 * ==================================================================== */

/* ---------- 1. Core utilities ---------- */
const APP_VERSION = '1.0.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('en-US', { maximumFractionDigits: d });
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nextStd = (list, v) => { for (const x of list) if (x >= v - 1e-9) return x; return null; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SQRT3 = Math.sqrt(3);

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('edg26:' + key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('edg26:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
};

function toast(message, opts = {}) {
  const host = $('#toasts');
  if (!host) return null;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = message;
  el.appendChild(text);
  const close = () => { el.remove(); };
  if (opts.action) {
    const b = document.createElement('button');
    b.className = 'btn btn-accent';
    b.type = 'button';
    b.textContent = opts.action.label;
    b.addEventListener('click', () => { opts.action.onClick(); close(); });
    el.appendChild(b);
  }
  if (opts.sticky) {
    const x = document.createElement('button');
    x.className = 'x';
    x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss');
    x.textContent = '×';
    x.addEventListener('click', close);
    el.appendChild(x);
  } else {
    setTimeout(close, opts.duration || 3200);
  }
  host.appendChild(el);
  return el;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
