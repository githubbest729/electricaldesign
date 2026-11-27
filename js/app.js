/* ============================================================================
 * 2026 Electrical Design Guide — Complete Offline-First PWA Application
 * ============================================================================ */
'use strict';

/* ---------- 1. Core Utilities ---------- */
const APP_VERSION = '1.0.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
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
    try {
      const v = localStorage.getItem('edg26:' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem('edg26:' + key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
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
  const close = () => el.remove();
  if (opts.action) {
    const b = document.createElement('button');
    b.className = 'btn btn-sm btn-accent';
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
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fallback */ }
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
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Modal Helper */
function openModal(title, bodyHTML, onMount) {
  const bd = $('#modal-backdrop');
  $('#modal-title').textContent = title;
  const body = $('#modal-body');
  body.innerHTML = bodyHTML;
  bd.hidden = false;
  if (typeof onMount === 'function') onMount(body, closeModal);
  const firstInput = body.querySelector('input, button, select');
  if (firstInput) firstInput.focus();
}
function closeModal() {
  const bd = $('#modal-backdrop');
  if (bd) bd.hidden = true;
}

/* ---------- 2. Engineering Data & Helper Functions ---------- */
const SPACES = [
  ['Residential', 'Living Room / Lounge', 150, 5.0],
  ['Residential', 'Kitchen Worktop / Utility', 300, 7.5],
  ['Residential', 'Bedroom / Hallway', 100, 4.0],
  ['Office', 'General Open Office', 500, 7.5],
  ['Office', 'Conference / Meeting Room', 350, 8.0],
  ['Office', 'CAD / Detailed Drafting', 750, 9.5],
  ['Commercial', 'Retail Sales Area', 500, 10.5],
  ['Commercial', 'Lobby / Corridor / Stairs', 150, 5.5],
  ['Education', 'Classroom / Lecture Hall', 400, 7.5],
  ['Healthcare', 'Examination / Lab Room', 500, 9.0],
  ['Industrial', 'Warehouse / Bulk Storage', 150, 4.5],
  ['Industrial', 'General Assembly / Workshop', 300, 7.0],
  ['Industrial', 'Precision Inspection Bench', 750, 11.0]
];

/* [size, mm2, kcmil, Cu[60,75,90], Al[60,75,90], THHN_area_in2, metric_mm2] */
const COND = [
  ['14', 2.08, 4.11, [15, 20, 25], null, 0.0097, 2.0],
  ['12', 3.31, 6.53, [20, 25, 30], [15, 20, 25], 0.0133, 3.5],
  ['10', 5.26, 10.38, [30, 35, 40], [25, 30, 35], 0.0211, 5.5],
  ['8', 8.37, 16.51, [40, 50, 55], [30, 40, 45], 0.0366, 8.0],
  ['6', 13.3, 26.24, [55, 65, 75], [40, 50, 55], 0.0507, 14],
  ['4', 21.2, 41.74, [70, 85, 95], [55, 65, 75], 0.0824, 22],
  ['3', 26.7, 52.62, [85, 100, 115], [65, 75, 85], 0.0973, 30],
  ['2', 33.6, 66.36, [95, 115, 130], [75, 90, 100], 0.1158, 38],
  ['1', 42.4, 83.69, [110, 130, 145], [85, 100, 115], 0.1562, 50],
  ['1/0', 53.5, 105.6, [125, 150, 170], [100, 120, 135], 0.1855, 60],
  ['2/0', 67.4, 133.1, [145, 175, 195], [115, 135, 150], 0.2223, 70],
  ['3/0', 85.0, 167.8, [165, 200, 225], [130, 155, 175], 0.2679, 80],
  ['4/0', 107.2, 211.6, [195, 230, 260], [150, 180, 205], 0.3237, 100],
  ['250', 127, 250, [215, 255, 290], [170, 205, 230], 0.3970, 125],
  ['300', 152, 300, [240, 285, 320], [195, 230, 260], 0.4608, 150],
  ['350', 177, 350, [260, 310, 350], [210, 250, 280], 0.5242, 175],
  ['400', 203, 400, [280, 335, 380], [225, 270, 305], 0.5863, 200],
  ['500', 253, 500, [320, 380, 430], [260, 310, 350], 0.7073, 250],
  ['600', 304, 600, [350, 420, 475], [285, 340, 385], 0.8676, 325],
  ['750', 380, 750, [400, 475, 535], [320, 385, 435], 1.0496, 400],
  ['1000', 507, 1000, [455, 545, 615], [375, 445, 500], 1.3478, 500]
].map(([s, mm2, kc, cu, al, a, met]) => ({
  s, mm2, kc, cu, al, a, met,
  lab: ['250', '300', '350', '400', '500', '600', '750', '1000'].includes(s) ? `${s} kcmil` : `${s} AWG`
}));

const CONDMAP = Object.fromEntries(COND.map((c) => [c.s, c]));
const condOptions = (from = 0) => COND.slice(from).map((c) => [c.s, `${c.lab} (${c.mm2} mm²)`]);
const IN2_TO_MM2 = 645.16;
const RHO = { cu: 0.02097, al: 0.03452 }; // ohm*mm2/m at 75 C
const XPM = 0.00017;                      // ohm/m typical reactance

const TEMP_ROWS = [
  [25, [1.08, 1.05, 1.04]], [30, [1.00, 1.00, 1.00]], [35, [0.91, 0.94, 0.96]],
  [40, [0.82, 0.88, 0.91]], [45, [0.71, 0.82, 0.87]], [50, [0.58, 0.75, 0.82]],
  [55, [0.41, 0.67, 0.76]], [60, [0.00, 0.58, 0.71]], [65, [0.00, 0.47, 0.65]],
  [70, [0.00, 0.33, 0.58]], [75, [0.00, 0.00, 0.50]], [80, [0.00, 0.00, 0.41]]
];
function tempFactor(ambient, rating) {
  const col = rating === 60 ? 0 : rating === 75 ? 1 : 2;
  for (const [mx, f] of TEMP_ROWS) if (ambient <= mx) return f[col];
  return 0;
}
function bundleFactor(n) {
  if (n <= 3) return 1.00;
  if (n <= 6) return 0.80;
  if (n <= 9) return 0.70;
  if (n <= 20) return 0.50;
  if (n <= 30) return 0.45;
  if (n <= 40) return 0.40;
  return 0.35;
}
const ratingCol = (r) => (r === 60 ? 0 : r === 75 ? 1 : 2);

function voltDrop({ phases, I, L, size, mat, pf }) {
  const c = CONDMAP[size];
  const r = RHO[mat] / c.mm2;
  const sin = Math.sqrt(Math.max(0, 1 - pf * pf));
  const k = phases === 1 ? 2 : SQRT3;
  return k * I * L * (r * pf + XPM * sin);
}

/* Trade sizes [inch, metric mm] & 100% internal area (in²) */
const TRADE = [
  ['1/2', 16], ['3/4', 21], ['1', 27], ['1-1/4', 35], ['1-1/2', 41],
  ['2', 53], ['2-1/2', 63], ['3', 78], ['3-1/2', 91], ['4', 103], ['5', 129], ['6', 155]
];
const CONDUIT = {
  pvc40: { name: 'PVC Schedule 40', a: [0.285, 0.508, 0.832, 1.453, 1.986, 3.291, 4.695, 7.268, 9.737, 12.554, 19.761, 28.567] },
  pvc80: { name: 'PVC Schedule 80', a: [0.217, 0.409, 0.688, 1.237, 1.711, 2.874, 4.119, 6.442, 8.688, 11.258, 17.855, 25.598] },
  emt:   { name: 'EMT (Electrical Metallic Tubing)', a: [0.304, 0.533, 0.864, 1.496, 2.036, 3.356, 5.858, 8.846, 11.545, 14.753, 22.900, 32.800] },
  imc:   { name: 'IMC (Intermediate Metal Conduit)', a: [0.342, 0.586, 0.959, 1.647, 2.225, 3.630, 5.135, 7.922, 10.584, 13.631, 21.200, 30.600] },
  rsc:   { name: 'RSC / RMC (Rigid Metal Conduit)', a: [0.314, 0.549, 0.887, 1.526, 2.071, 3.408, 4.866, 7.499, 10.010, 12.882, 20.212, 29.158] }
};

const STD_OCPD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000];
const STD_XFMR_KVA = [15, 25, 30, 37.5, 45, 50, 75, 100, 112.5, 150, 167, 225, 250, 300, 333, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000];
const STD_GEN_KVA = [15, 20, 30, 45, 60, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 500, 625, 750, 1000, 1250, 1500, 2000];
const STD_BUSBAR = [100, 125, 150, 200, 225, 250, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000, 2500, 3200, 4000];
const STD_DISCONNECT = [30, 60, 100, 200, 400, 600, 800, 1200, 1600, 2000];
const STD_CT_PRIM = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1600, 2000, 2500, 3000, 4000, 5000];

/* EGC Table [maxOCPD, CuSize, AlSize] */
const EGC_TABLE = [
  [15, '14', '12'], [20, '12', '10'], [60, '10', '8'], [100, '8', '6'],
  [200, '6', '4'], [300, '4', '2'], [400, '3', '1'], [500, '2', '1/0'],
  [600, '1', '2/0'], [800, '1/0', '3/0'], [1000, '2/0', '4/0'], [1200, '3/0', '250'],
  [1600, '4/0', '350'], [2000, '250', '400'], [2500, '350', '600'],
  [3000, '400', '600'], [4000, '500', '750']
];

/* GEC Table [maxCuServiceMM2, maxAlServiceMM2, CuGEC, AlGEC] */
const GEC_TABLE = [
  [33.6, 53.5, '8', '6'],
  [53.5, 85.0, '6', '4'],
  [85.0, 127.0, '4', '2'],
  [177.0, 253.0, '2', '1/0'],
  [304.0, 456.0, '1/0', '3/0'],
  [557.0, 887.0, '2/0', '4/0'],
  [99999, 99999, '3/0', '250']
];

/* ---------- 3. All 9 Interactive 2026 Electrical Design Modules ---------- */
const MODULES = [];
const row = (k, v, u, s, big) => ({ k, v, u: u || '', s: s || '', big: !!big });
const spaceOptions = SPACES.map((s, i) => [String(i), `${s[0]} — ${s[1]} (${s[2]} lx)`]);
const CFG = {
  '1p2w': { name: '1-Phase, 2-Wire (1L + N)', hot: 1, neu: 1 },
  '1p3w': { name: '1-Phase, 3-Wire (2L + N)', hot: 2, neu: 1 },
  '3p3w': { name: '3-Phase, 3-Wire (3L)', hot: 3, neu: 0 },
  '3p4w': { name: '3-Phase, 4-Wire (3L + N)', hot: 3, neu: 1 }
};
const tradeLabel = (i) => `${TRADE[i][0]} in (${TRADE[i][1]} mm)`;

/* ===== MODULE 1: Illumination Computation ===== */
MODULES.push({
  id: 'illumination', num: 1, cat: 'Lighting',
  title: 'Illumination Computation',
  short: 'Lumen Method for 2026 LED lighting: fixture count, layout grid, spacing-to-height ratio (SHR), achieved lux, and LPD check.',
  tags: ['Lumen Method', '2026 LED', 'LPD W/m²'],
  guide: [
    { h: '2026 Lighting Design Essentials', items: [
      'Design to <strong>maintained illuminance (lux)</strong> on the working plane using LED luminaires rated L80/L90 ≥ 50,000 hrs and a realistic Maintenance Factor (MF).',
      'Typical LED MF is <strong>0.80–0.88</strong> for clean air-conditioned interiors and <strong>0.70–0.75</strong> for industrial workshops.',
      'Check <strong>Lighting Power Density (LPD, W/m²)</strong> against 2026 energy codes; high-efficacy LEDs (≥ 110 lm/W) typically achieve 4.5–9.5 W/m².',
      'Keep Spacing-to-Mounting-Height Ratio (SHR) at or below the luminaire limit (typically 1.0–1.5) to maintain uniformity ≥ 0.60.',
      'Provide dedicated emergency/egress lighting (≥ 1 lx along exit paths, 90 min minimum autonomy) on a separate circuit.'
    ] },
    { h: 'Step-by-Step Lumen Method', items: [
      'Select the space category and target maintained illuminance (lux).',
      'Calculate Room Index: <code>RI = (L × W) / (Hm × (L + W))</code> where Hm is fixture height above the working plane.',
      'Determine Coefficient of Utilization (CU) from photometric data based on RI and ceiling/wall/floor reflectances (70/50/20%).',
      'Compute fixture count, round up to a symmetric rows × columns array, and verify achieved lux, SHR, and LPD.'
    ] }
  ],
  formulas: [
    { n: 'Luminaires Required', e: 'N = (E × A) / (Φ × CU × MF)', t: 'E = target lux, A = area (m²), Φ = lumens/fixture' },
    { n: 'Room Index', e: 'RI = (L × W) / (Hm × (L + W))', t: 'Hm = mounting height above working plane (m)' },
    { n: 'Achieved Illuminance', e: 'E_act = (N × Φ × CU × MF) / A', t: 'Actual maintained lux after rounding fixture count' },
    { n: 'Lighting Power Density', e: 'LPD = (N × P_fix) / A  [W/m²]', t: 'Compare against target energy-code LPD' }
  ],
  tables: [
    { title: '2026 Reference Maintained Illuminance & LED LPD Targets', head: ['Category', 'Space Type', 'Target Lux', 'Target LPD (W/m²)'], num: [2, 3],
      rows: SPACES.map((s) => [s[0], s[1], s[2], s[3]]),
      note: 'Aligned with modern PEC / IES / EN 12464-1 LED design practice. Verify project-specific energy code caps.' }
  ],
  calcs: [{
    id: 'lumen', title: 'Lumen Method & LPD Calculator',
    intro: 'Computes required LED luminaires, symmetric grid layout, spacing-to-height ratio, achieved lux, and W/m² LPD compliance.',
    fields: [
      { id: 'space', label: 'Space Preset', type: 'select', value: '3', options: spaceOptions },
      { id: 'lux', label: 'Target Maintained Lux', type: 'number', value: 500, unit: 'lx', gt: 0, max: 5000, help: 'Override preset target if needed' },
      { id: 'len', label: 'Room Length (L)', type: 'number', value: 12, unit: 'm', gt: 0, max: 500 },
      { id: 'wid', label: 'Room Width (W)', type: 'number', value: 8, unit: 'm', gt: 0, max: 500 },
      { id: 'hm', label: 'Mounting Height Above Workplane (Hm)', type: 'number', value: 2.2, unit: 'm', gt: 0.3, max: 30, help: 'Ceiling height minus desk height (e.g., 3.0 − 0.8 = 2.2 m)' },
      { id: 'lumens', label: 'Lumens per Luminaire (Φ)', type: 'number', value: 4200, unit: 'lm', gt: 50, max: 200000 },
      { id: 'watts', label: 'Input Power per Luminaire', type: 'number', value: 36, unit: 'W', gt: 1, max: 5000 },
      { id: 'cu', label: 'Coefficient of Utilization (CU)', type: 'number', value: 0.72, step: '0.01', gt: 0.1, max: 1.0 },
      { id: 'mf', label: 'Maintenance Factor (MF)', type: 'number', value: 0.82, step: '0.01', gt: 0.2, max: 1.0 },
      { id: 'maxShr', label: 'Max Luminaire SHR', type: 'number', value: 1.4, step: '0.1', gt: 0.3, max: 3.0 }
    ],
    onFieldChange(id, vals, form) {
      if (id === 'space') {
        const sp = SPACES[Number(vals.space)];
        if (sp && form.elements.lux) form.elements.lux.value = sp[2];
      }
    },
    compute(v) {
      const sp = SPACES[Number(v.space)] || SPACES[3];
      const area = v.len * v.wid;
      const ri = area / (v.hm * (v.len + v.wid));
      const nExact = (v.lux * area) / (v.lumens * v.cu * v.mf);
      const nMin = Math.ceil(nExact);
      const aspect = v.len / v.wid;
      let cols = Math.max(1, Math.round(Math.sqrt(nMin * aspect)));
      let rows = Math.max(1, Math.ceil(nMin / cols));
      let nLayout = rows * cols;
      const spX = v.len / cols;
      const spY = v.wid / rows;
      const maxSpacing = Math.max(spX, spY);
      const shr = maxSpacing / v.hm;
      const achievedLux = (nLayout * v.lumens * v.cu * v.mf) / area;
      const totalW = nLayout * v.watts;
      const lpd = totalW / area;
      const lpdTarget = sp[3];
      const efficacy = v.lumens / v.watts;
      const shrStatus = shr <= v.maxShr ? 'ok' : 'warn';
      const lpdStatus = lpd <= lpdTarget ? 'ok' : (lpd <= lpdTarget * 1.15 ? 'warn' : 'err');
      const luxStatus = achievedLux >= v.lux * 0.95 ? 'ok' : 'warn';
      return {
        rows: [
          row('Recommended Fixtures (Layout)', `${nLayout} pcs (${rows} × ${cols} grid)`, '', 'ok', true),
          row('Exact Theoretical Count', fmt(nExact, 2), 'luminaires'),
          row('Floor Area / Room Index (RI)', `${fmt(area, 1)} m² / RI ${fmt(ri, 2)}`, ''),
          row('Achieved Maintained Illuminance', fmt(achievedLux, 0), 'lx', luxStatus),
          row('Fixture Spacing (L × W)', `${fmt(spX, 2)} m × ${fmt(spY, 2)} m`, ''),
          row('Spacing-to-Height Ratio (SHR)', fmt(shr, 2), `(max ${fmt(v.maxShr, 2)})`, shrStatus),
          row('Total Connected Lighting Load', fmt(totalW, 0), 'W'),
          row('Lighting Power Density (LPD)', fmt(lpd, 2), `W/m² (target ≤ ${lpdTarget})`, lpdStatus),
          row('Luminaire Efficacy', fmt(efficacy, 1), 'lm/W', efficacy >= 100 ? 'ok' : 'warn')
        ],
        bars: [
          { label: `LPD vs Target (${lpdTarget} W/m²)`, value: (lpd / lpdTarget) * 100, text: `${fmt(lpd, 2)} / ${lpdTarget} W/m²`, status: lpdStatus },
          { label: `SHR vs Max Limit (${v.maxShr})`, value: (shr / v.maxShr) * 100, text: `${fmt(shr, 2)} / ${v.maxShr}`, status: shrStatus }
        ],
        notes: [
          shr > v.maxShr ? 'SHR exceeds luminaire maximum — increase rows/columns with lower-lumen fixtures for uniform lighting.' : 'Fixture spacing meets uniformity SHR criteria.',
          lpd > lpdTarget ? 'LPD exceeds target — consider higher-efficacy LED fixtures (≥ 120 lm/W) or task/ambient zoning.' : 'Lighting Power Density complies with 2026 LED efficiency target.'
        ]
      };
    }
  }]
});

/* ===== MODULE 2: General Design Considerations ===== */
MODULES.push({
  id: 'general', num: 2, cat: 'Fundamentals',
  title: 'General Design Considerations',
  short: '2026 engineering rules: 3%/5% voltage drop checker, 125% continuous load factor, power factor analyzer, and EV/PV/SPD readiness.',
  tags: ['Voltage Drop', 'Power Factor', '125% Rule', '2026 Ready'],
  guide: [
    { h: 'Core 2026 Electrical Design Rules', items: [
      '<strong>Voltage Drop Limits:</strong> Hold branch circuits to <strong>≤ 3%</strong> and combined feeder + branch circuits to <strong>≤ 5%</strong> at full design load.',
      '<strong>125% Continuous Load Rule:</strong> Loads operating continuously for ≥ 3 hours (lighting, EV chargers, HVAC, servers) require 125% sizing for OCPD and un-derated conductors.',
      '<strong>Ambient & Bundling Derating:</strong> Adjust conductor ampacity when ambient temperature exceeds 30 °C or more than 3 current-carrying conductors share a raceway.',
      '<strong>Power Factor Target:</strong> Maintain overall facility PF ≥ 0.90–0.95 to minimize reactive current losses and utility penalties; use detuned capacitor banks where VFD/LED harmonics exist.',
      '<strong>2026 Future-Readiness:</strong> Reserve ≥ 20% spare panel ways, ≥ 25% spare conduit capacity, EV charging raceway/load-management readiness, PV/BESS interconnection provisions, and coordinated Type 1/2/3 SPDs.'
    ] }
  ],
  formulas: [
    { n: '1-Phase Voltage Drop', e: 'Vd = 2 × I × L × (R·cosθ + X·sinθ)', t: 'L = one-way run length in meters' },
    { n: '3-Phase Voltage Drop', e: 'Vd = √3 × I × L × (R·cosθ + X·sinθ)', t: 'Percent Vd = (Vd / V_sys) × 100' },
    { n: 'Apparent / Real / Reactive Power', e: 'kVA = √(kW² + kVAR²),  PF = kW / kVA', t: '1-Ph: kVA = V·I/1000; 3-Ph: kVA = √3·V·I/1000' }
  ],
  tables: [
    { title: 'Ambient Temperature Correction Factors (Base 30 °C)', head: ['Ambient (°C)', '60 °C Insul.', '75 °C Insul.', '90 °C Insul.'], num: [0, 1, 2, 3],
      rows: TEMP_ROWS.map(([t, f]) => [`≤ ${t} °C`, f[0].toFixed(2), f[1].toFixed(2), f[2].toFixed(2)]) },
    { title: 'Conduit Bundling Adjustment Factors', head: ['Current-Carrying Conductors', 'Factor'], num: [1],
      rows: [['1 – 3', '1.00'], ['4 – 6', '0.80'], ['7 – 9', '0.70'], ['10 – 20', '0.50'], ['21 – 30', '0.45'], ['31 – 40', '0.40'], ['41+', '0.35']] }
  ],
  calcs: [
    {
      id: 'vdrop', title: 'Voltage Drop Checker (1-Ph & 3-Ph)',
      intro: 'Checks actual voltage drop in volts and percentage against 3% branch and 5% total design limits.',
      fields: [
        { id: 'phases', label: 'System Phase', type: 'select', value: '3', options: [['1', '1-Phase (2-Wire)'], ['3', '3-Phase (3/4-Wire)']] },
        { id: 'volts', label: 'System Voltage', type: 'number', value: 400, unit: 'V', gt: 12, max: 35000 },
        { id: 'amps', label: 'Load Current (I)', type: 'number', value: 45, unit: 'A', gt: 0, max: 5000 },
        { id: 'length', label: 'One-Way Cable Length (L)', type: 'number', value: 65, unit: 'm', gt: 0, max: 5000 },
        { id: 'mat', label: 'Conductor Material', type: 'select', value: 'cu', options: [['cu', 'Copper (Cu)'], ['al', 'Aluminum (Al)']] },
        { id: 'size', label: 'Conductor Size', type: 'select', value: '6', options: condOptions(0) },
        { id: 'pf', label: 'Power Factor (cos θ)', type: 'number', value: 0.90, step: '0.01', gt: 0.1, max: 1.0 },
        { id: 'limit', label: 'Circuit Limit', type: 'select', value: '3', options: [['3', '3% (Branch Circuit)'], ['2', '2% (Feeder Only)'], ['5', '5% (Total Feeder + Branch)']] }
      ],
      compute(v) {
        const phases = Number(v.phases);
        const limit = Number(v.limit);
        const vd = voltDrop({ phases, I: v.amps, L: v.length, size: v.size, mat: v.mat, pf: v.pf });
        const pct = (vd / v.volts) * 100;
        const vLoad = v.volts - vd;
        const st = pct <= limit ? 'ok' : (pct <= 5 ? 'warn' : 'err');
        const c = CONDMAP[v.size];
        let nextSizeNote = '';
        if (pct > limit) {
          const better = COND.find((x) => {
            if (v.mat === 'al' && !x.al) return false;
            const p = (voltDrop({ phases, I: v.amps, L: v.length, size: x.s, mat: v.mat, pf: v.pf }) / v.volts) * 100;
            return p <= limit;
          });
          nextSizeNote = better ? `Upsize to ${better.lab} (${better.mm2} mm²) to stay within ${limit}%.` : 'Consider parallel runs or higher distribution voltage.';
        }
        return {
          rows: [
            row('Voltage Drop (%)', `${fmt(pct, 2)} %`, `(limit ≤ ${limit}%)`, st, true),
            row('Voltage Drop (Volts)', fmt(vd, 2), 'V'),
            row('Voltage at Load Terminals', fmt(vLoad, 1), 'V'),
            row('Selected Conductor', `${c.lab} (${c.mm2} mm²)`, v.mat === 'cu' ? 'Copper' : 'Aluminum')
          ],
          bars: [
            { label: `Voltage Drop vs ${limit}% Limit`, value: (pct / limit) * 100, text: `${fmt(pct, 2)}% / ${limit}%`, status: st }
          ],
          notes: [nextSizeNote || `Voltage drop is within the ${limit}% design limit.`]
        };
      }
    },
    {
      id: 'pfcalc', title: 'Power Factor & Continuous Load Analyzer',
      intro: 'Computes real/apparent/reactive power, line current, 125% continuous design current, and capacitor kVAR needed to reach target PF.',
      fields: [
        { id: 'phases', label: 'System Phase', type: 'select', value: '3', options: [['1', '1-Phase'], ['3', '3-Phase']] },
        { id: 'volts', label: 'System Voltage', type: 'number', value: 400, unit: 'V', gt: 12, max: 35000 },
        { id: 'kw', label: 'Active Load Power (P)', type: 'number', value: 50, unit: 'kW', gt: 0, max: 50000 },
        { id: 'pf', label: 'Existing Power Factor', type: 'number', value: 0.78, step: '0.01', gt: 0.2, max: 1.0 },
        { id: 'targetPf', label: 'Target Power Factor', type: 'number', value: 0.95, step: '0.01', gt: 0.5, max: 1.0 },
        { id: 'cont', label: 'Continuous Load (≥ 3 hrs)?', type: 'select', value: 'yes', options: [['yes', 'Yes (Apply 125%)'], ['no', 'No (100%)']] }
      ],
      compute(v) {
        const phases = Number(v.phases);
        const kva = v.kw / v.pf;
        const kvar = kva * Math.sqrt(Math.max(0, 1 - v.pf * v.pf));
        const amps = phases === 1 ? (kva * 1000) / v.volts : (kva * 1000) / (SQRT3 * v.volts);
        const designAmps = v.cont === 'yes' ? amps * 1.25 : amps;
        const phi1 = Math.acos(clamp(v.pf, 0.01, 1));
        const phi2 = Math.acos(clamp(v.targetPf, 0.01, 1));
        const kvarCorr = Math.max(0, v.kw * (Math.tan(phi1) - Math.tan(phi2)));
        const kvaNew = v.kw / Math.max(v.pf, v.targetPf);
        const ampsNew = phases === 1 ? (kvaNew * 1000) / v.volts : (kvaNew * 1000) / (SQRT3 * v.volts);
        const st = v.pf >= 0.90 ? 'ok' : (v.pf >= 0.85 ? 'warn' : 'err');
        return {
          rows: [
            row('Apparent Power (S)', fmt(kva, 2), 'kVA', st, true),
            row('Reactive Power (Q)', fmt(kvar, 2), 'kVAR'),
            row('Full Load Current', fmt(amps, 1), 'A'),
            row('Design Current (Continuous Rule)', fmt(designAmps, 1), v.cont === 'yes' ? 'A (125%)' : 'A (100%)'),
            row('Capacitor Bank Required', fmt(kvarCorr, 2), `kVAR (to reach ${v.targetPf} PF)`),
            row('Current After PF Correction', fmt(ampsNew, 1), `A (saves ${fmt(amps - ampsNew, 1)} A)`)
          ],
          notes: [
            kvarCorr > 0 ? 'If harmonic-rich loads (VFDs, UPS, LEDs) exceed 15–20% of transformer kVA, specify 7% detuned reactors with the capacitor bank.' : 'Power factor already meets or exceeds the target value.'
          ]
        };
      }
    }
  ]
});

/* ===== MODULE 3: Conduit Sizing ===== */
MODULES.push({
  id: 'conduit', num: 3, cat: 'Raceways',
  title: 'Conduit Sizing (1-Phase & 3-Phase)',
  short: 'THHN/THWN-2 conduit fill calculator for PVC Sch 40/80, EMT, IMC, and RSC enforcing 53% / 31% / 40% fill limits.',
  tags: ['53 / 31 / 40% Fill', 'PVC / EMT / RSC', 'Trade Size'],
  guide: [
    { h: 'Conduit Fill Standards', items: [
      'Maximum cross-sectional fill: <strong>53%</strong> for 1 conductor, <strong>31%</strong> for 2 conductors, and <strong>40%</strong> for 3 or more conductors.',
      'Always include <strong>all conductors</strong> in the raceway—phase wires, neutral wires, and equipment grounding conductors (EGC).',
      'Limit bends to a maximum of <strong>360°</strong> between pull points; specify pull boxes on long or multi-bend runs.',
      'Check bundling ampacity derating whenever more than 3 current-carrying conductors share the same conduit.'
    ] }
  ],
  formulas: [
    { n: 'Total Conductor Area', e: 'A_total = Σ (n_i × a_i)', t: 'Finished insulated cross-sectional area of each wire' },
    { n: 'Percent Fill', e: 'Fill % = (A_total / A_conduit) × 100', t: 'Compare against 53% (1), 31% (2), or 40% (3+)' }
  ],
  tables: [
    { title: 'Conduit 100% Internal Area Reference (in²)', head: ['Trade Size', 'Metric', 'PVC 40', 'PVC 80', 'EMT', 'IMC', 'RSC'], num: [2, 3, 4, 5, 6],
      rows: TRADE.map((t, i) => [`${t[0]}"`, `${t[1]} mm`, CONDUIT.pvc40.a[i], CONDUIT.pvc80.a[i], CONDUIT.emt.a[i], CONDUIT.imc.a[i], CONDUIT.rsc.a[i]]) }
  ],
  calcs: [{
    id: 'fill', title: 'Conduit Fill Calculator (THHN/THWN-2)',
    intro: 'Selects the smallest standard conduit trade size satisfying 53/31/40% fill rules for 1-phase or 3-phase wire groups.',
    fields: [
      { id: 'cfg', label: 'Circuit Wiring Configuration', type: 'select', value: '3p4w', options: Object.entries(CFG).map(([k, c]) => [k, c.name]) },
      { id: 'circuits', label: 'Number of Identical Circuits', type: 'number', value: 1, step: 1, min: 1, max: 20 },
      { id: 'wireSize', label: 'Phase & Neutral Conductor Size', type: 'select', value: '6', options: condOptions(0) },
      { id: 'egcCount', label: 'Equipment Ground Wires (EGC)', type: 'number', value: 1, step: 1, min: 0, max: 10 },
      { id: 'egcSize', label: 'EGC Size', type: 'select', value: '10', options: condOptions(0), showIf: (v) => v.egcCount > 0 },
      { id: 'ctype', label: 'Conduit Type', type: 'select', value: 'pvc40', options: Object.entries(CONDUIT).map(([k, c]) => [k, c.name]) }
    ],
    compute(v) {
      const cfg = CFG[v.cfg];
      const phaseNeuPerCkt = cfg.hot + cfg.neu;
      const mainCount = phaseNeuPerCkt * v.circuits;
      const totalCount = mainCount + v.egcCount;
      if (totalCount < 1) return { error: 'At least 1 conductor is required.' };
      const limitPct = totalCount === 1 ? 53 : (totalCount === 2 ? 31 : 40);
      const wireArea = mainCount * CONDMAP[v.wireSize].a;
      const egcArea = v.egcCount > 0 ? v.egcCount * CONDMAP[v.egcSize].a : 0;
      const totalIn2 = wireArea + egcArea;
      const totalMm2 = totalIn2 * IN2_TO_MM2;
      const reqConduitIn2 = totalIn2 / (limitPct / 100);
      const cdata = CONDUIT[v.ctype];
      const idx = cdata.a.findIndex((a) => a >= reqConduitIn2);
      if (idx === -1) {
        return { error: 'Exceeds 6 in (155 mm) conduit capacity.', hint: 'Split into parallel conduits or reduce circuits per raceway.' };
      }
      const chosenIn2 = cdata.a[idx];
      const fillPct = (totalIn2 / chosenIn2) * 100;
      const ccc = cfg.hot * v.circuits;
      const bFac = bundleFactor(ccc);
      const fillSt = fillPct <= limitPct * 0.85 ? 'ok' : 'warn';
      return {
        rows: [
          row('Recommended Conduit Trade Size', tradeLabel(idx), cdata.name, 'ok', true),
          row('Exact Conduit Fill', `${fmt(fillPct, 1)} %`, `(limit ≤ ${limitPct}%)`, fillSt),
          row('Total Conductors in Raceway', `${totalCount} wires`, `(${mainCount} phase/N + ${v.egcCount} EGC)`),
          row('Total Conductor Area', `${fmt(totalMm2, 1)} mm²`, `(${totalIn2.toFixed(4)} in²)`),
          row('Conduit Internal Area (100%)', `${fmt(chosenIn2 * IN2_TO_MM2, 1)} mm²`, `(${chosenIn2.toFixed(3)} in²)`),
          row('Bundling Ampacity Factor', fmt(bFac, 2), `(${ccc} current-carrying wires)`, bFac < 1 ? 'warn' : 'ok')
        ],
        bars: [
          { label: `Fill vs Allowed Limit (${limitPct}%)`, value: (fillPct / limitPct) * 100, text: `${fmt(fillPct, 1)}% / ${limitPct}%`, status: fillSt }
        ],
        notes: [
          idx < TRADE.length - 1 ? `Next trade size up for future pulling ease: ${tradeLabel(idx + 1)}.` : 'Maximum standard trade size reached.',
          bFac < 1 ? `More than 3 current-carrying conductors (${ccc}): apply ${bFac} bundling derating factor in Module 4.` : 'No bundling derating required (≤ 3 current-carrying conductors).'
        ]
      };
    }
  }]
});

/* ===== MODULE 4: Conductor Sizing ===== */
MODULES.push({
  id: 'conductor', num: 4, cat: 'Conductors',
  title: 'Conductor Sizing (1-Phase & 3-Phase)',
  short: 'Combined ampacity, ambient/bundling derating, 125% continuous load, and voltage-drop-verified sizing in AWG/kcmil & mm².',
  tags: ['Ampacity', 'Derating', 'V-Drop Verified', 'AWG & mm²'],
  guide: [
    { h: 'Dual-Criteria Conductor Sizing', items: [
      'A compliant conductor must satisfy <strong>both</strong> thermal ampacity (after ambient & bundling derating) AND maximum voltage drop (≤ 3% branch / ≤ 5% total).',
      'Terminal temperature limits (typically <strong>60 °C</strong> for circuits ≤ 100 A unless rated 75 °C; <strong>75 °C</strong> for > 100 A) govern final usable ampacity even when using 90 °C THHN insulation. Use 90 °C column for derating, then cap at terminal rating.',
      'For continuous loads, size conductor ampacity to at least <strong>125%</strong> of continuous load before checking derated 90 °C ampacity against 100% load.'
    ] }
  ],
  formulas: [
    { n: '1-Phase / 3-Phase Load Current', e: 'I_1ph = kW·1000/(V·PF)  |  I_3ph = kW·1000/(√3·V·PF)', t: 'Use line-to-line voltage for 3-phase' },
    { n: 'Derated Ampacity Check', e: 'I_allow = min(I_term, I_90°C × F_temp × F_bundle)', t: 'Must meet or exceed required circuit current' }
  ],
  tables: [
    { title: 'Copper & Aluminum Ampacity Reference (30 °C, ≤ 3 CCC)', head: ['Size', 'mm²', 'Cu 60°C', 'Cu 75°C', 'Cu 90°C', 'Al 75°C', 'Nearest Metric'], num: [1, 2, 3, 4, 5, 6],
      rows: COND.map((c) => [c.lab, c.mm2, c.cu[0], c.cu[1], c.cu[2], c.al ? c.al[1] : '—', `${c.met} mm²`]) }
  ],
  calcs: [{
    id: 'wire', title: '1-Phase & 3-Phase Conductor Sizing Calculator',
    intro: 'Automatically selects the smallest compliant conductor satisfying derated ampacity AND voltage drop limit.',
    fields: [
      { id: 'phases', label: 'System Phase', type: 'select', value: '3', options: [['1', '1-Phase'], ['3', '3-Phase']] },
      { id: 'volts', label: 'System Voltage', type: 'number', value: 400, unit: 'V', gt: 12, max: 15000 },
      { id: 'inputMode', label: 'Load Input Type', type: 'select', value: 'amps', options: [['amps', 'Current (A)'], ['kw', 'Active Power (kW)'], ['kva', 'Apparent Power (kVA)']] },
      { id: 'loadVal', label: 'Load Value', type: 'number', value: 60, gt: 0, max: 50000 },
      { id: 'pf', label: 'Power Factor', type: 'number', value: 0.90, step: '0.01', gt: 0.2, max: 1.0 },
      { id: 'cont', label: 'Continuous Load (≥ 3 hrs)?', type: 'select', value: 'yes', options: [['yes', 'Yes (125% Rule)'], ['no', 'No (100%)']] },
      { id: 'mat', label: 'Conductor Material', type: 'select', value: 'cu', options: [['cu', 'Copper (Cu)'], ['al', 'Aluminum (Al)']] },
      { id: 'term', label: 'Terminal Rating', type: 'select', value: '75', options: [['60', '60 °C'], ['75', '75 °C (Standard)'], ['90', '90 °C']] },
      { id: 'amb', label: 'Ambient Temperature', type: 'number', value: 35, unit: '°C', min: 10, max: 75 },
      { id: 'ccc', label: 'Current-Carrying Conductors', type: 'number', value: 3, step: 1, min: 1, max: 50 },
      { id: 'length', label: 'One-Way Run Length', type: 'number', value: 45, unit: 'm', gt: 0, max: 5000 },
      { id: 'vdLimit', label: 'Max Voltage Drop', type: 'number', value: 3.0, unit: '%', step: '0.5', gt: 0.5, max: 10 }
    ],
    compute(v) {
      const phases = Number(v.phases);
      const term = Number(v.term);
      let loadI = v.loadVal;
      if (v.inputMode === 'kw') {
        loadI = phases === 1 ? (v.loadVal * 1000) / (v.volts * v.pf) : (v.loadVal * 1000) / (SQRT3 * v.volts * v.pf);
      } else if (v.inputMode === 'kva') {
        loadI = phases === 1 ? (v.loadVal * 1000) / v.volts : (v.loadVal * 1000) / (SQRT3 * v.volts);
      }
      const reqTermI = v.cont === 'yes' ? loadI * 1.25 : loadI;
      const fTemp90 = tempFactor(v.amb, 90);
      const fBun = bundleFactor(v.ccc);
      if (fTemp90 <= 0) return { error: 'Ambient temperature exceeds 90 °C insulation rating.' };

      const tCol = ratingCol(term);
      const findAmp = COND.find((c) => {
        const arr = v.mat === 'cu' ? c.cu : c.al;
        if (!arr) return false;
        const termCap = arr[tCol];
        const derated90 = arr[2] * fTemp90 * fBun;
        return termCap >= reqTermI && derated90 >= loadI;
      });

      const findVd = COND.find((c) => {
        if (v.mat === 'al' && !c.al) return false;
        const pct = (voltDrop({ phases, I: loadI, L: v.length, size: c.s, mat: v.mat, pf: v.pf }) / v.volts) * 100;
        return pct <= v.vdLimit;
      });

      if (!findAmp || !findVd) {
        return { error: 'Required conductor exceeds single 1000 kcmil (500 mm²).', hint: 'Design parallel conductor sets per phase (e.g., 2 sets of smaller conductors).' };
      }

      const idxAmp = COND.indexOf(findAmp);
      const idxVd = COND.indexOf(findVd);
      const gov = COND[Math.max(idxAmp, idxVd)];
      const govReason = idxVd > idxAmp ? 'Voltage Drop' : 'Thermal Ampacity';
      const arr = v.mat === 'cu' ? gov.cu : gov.al;
      const effAmp = Math.min(arr[tCol], arr[2] * fTemp90 * fBun);
      const vdV = voltDrop({ phases, I: loadI, L: v.length, size: gov.s, mat: v.mat, pf: v.pf });
      const vdPct = (vdV / v.volts) * 100;
      const ocpdSuggest = nextStd(STD_OCPD, reqTermI);

      return {
        rows: [
          row('Recommended Conductor', `${gov.lab} (${gov.mm2} mm²)`, `Nearest Metric: ${gov.met} mm²`, 'ok', true),
          row('Governing Criterion', govReason, govReason === 'Voltage Drop' ? 'Upsized for V-drop' : 'Ampacity governed'),
          row('Load / Continuous Design Current', `${fmt(loadI, 1)} A / ${fmt(reqTermI, 1)} A`, ''),
          row('Effective Allowable Ampacity', fmt(effAmp, 1), `A (F_temp ${fTemp90.toFixed(2)} × F_bundle ${fBun.toFixed(2)})`, 'ok'),
          row('Minimum for Ampacity Alone', `${findAmp.lab} (${findAmp.mm2} mm²)`, ''),
          row('Minimum for Voltage Drop Alone', `${findVd.lab} (${findVd.mm2} mm²)`, ''),
          row('Actual Voltage Drop', `${fmt(vdPct, 2)} %`, `(${fmt(vdV, 2)} V, limit ≤ ${v.vdLimit}%)`, vdPct <= v.vdLimit ? 'ok' : 'err'),
          row('Suggested Next Standard OCPD', ocpdSuggest ? `${ocpdSuggest} A` : 'Custom', '(verify in Module 5)')
        ],
        bars: [
          { label: `Ampacity Utilization`, value: (loadI / effAmp) * 100, text: `${fmt(loadI, 1)} A / ${fmt(effAmp, 1)} A`, status: (loadI / effAmp) <= 0.85 ? 'ok' : 'warn' },
          { label: `Voltage Drop vs ${v.vdLimit}% Limit`, value: (vdPct / v.vdLimit) * 100, text: `${fmt(vdPct, 2)}% / ${v.vdLimit}%`, status: vdPct <= v.vdLimit ? 'ok' : 'err' }
        ],
        notes: [
          idxVd > idxAmp ? `Conductor was upsized from ${findAmp.lab} to ${gov.lab} for voltage drop — remember to proportionally upsize the EGC in Module 8.` : 'Ampacity governs; voltage drop is comfortably within limit.'
        ]
      };
    }
  }]
});

/* ===== MODULE 5: OCPD Sizing ===== */
MODULES.push({
  id: 'ocpd', num: 5, cat: 'Protection',
  title: 'OCPD Sizing for Main & Branch Circuits',
  short: 'Standard circuit breaker and fuse selection for lighting, receptacle, continuous feeder, and motor branch circuits.',
  tags: ['Breakers & Fuses', 'Standard Ratings', 'Motor OCPD'],
  guide: [
    { h: 'Overcurrent Protective Device (OCPD) Rules', items: [
      '<strong>General / Feeder Circuits:</strong> OCPD ≥ 100% of non-continuous load + <strong>125%</strong> of continuous load.',
      '<strong>Next-Size-Up Rule (≤ 800 A):</strong> Where conductor ampacity does not match a standard OCPD rating (and is not feeding multi-outlet receptacles), the next higher standard rating is permitted up to 800 A. Above 800 A, conductor ampacity must be ≥ OCPD rating.',
      '<strong>Motor Branch Circuits:</strong> Inverse-time breakers are sized up to <strong>250%</strong> of motor FLC (dual-element time-delay fuses up to <strong>175%</strong>) to ride through locked-rotor starting current while overload relays protect running current.',
      'Always verify <strong>AIC / kAIC</strong> interrupting rating exceeds available short-circuit fault current at the panel.'
    ] }
  ],
  formulas: [
    { n: 'Feeder / Branch OCPD', e: 'I_OCPD ≥ 1.25 × I_cont + 1.00 × I_noncont', t: 'Snap up to standard breaker rating' },
    { n: 'Motor Branch OCPD', e: 'I_max = Factor × FLC  (250% IT breaker / 175% TD fuse)', t: 'Motor branch conductors ≥ 125% FLC' }
  ],
  tables: [
    { title: 'Standard OCPD Ampere Ratings', head: ['Range', 'Standard Ratings (A)'],
      rows: [
        ['Branch / Small', '15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100'],
        ['Sub-Feeders', '110, 125, 150, 175, 200, 225, 250, 300, 350, 400'],
        ['Main Switchgear', '450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000']
      ] }
  ],
  calcs: [{
    id: 'ocpdCalc', title: 'Main, Feeder & Motor OCPD Sizing Calculator',
    intro: 'Computes required standard breaker/fuse rating, recommended frame/pole setup, and minimum protected conductor ampacity.',
    fields: [
      { id: 'mode', label: 'Circuit Type', type: 'select', value: 'feeder', options: [['feeder', 'Main / Feeder / Branch Circuit'], ['motor', 'Motor Branch Circuit']] },
      { id: 'poles', label: 'System / Poles', type: 'select', value: '3P', options: [['1P', '1-Pole (1-Ph Line-Neutral)'], ['2P', '2-Pole (1-Ph 2-Line)'], ['3P', '3-Pole (3-Phase)']] },
      { id: 'contI', label: 'Continuous Load Current', type: 'number', value: 64, unit: 'A', min: 0, max: 3200, showIf: (v) => v.mode === 'feeder' },
      { id: 'nonContI', label: 'Non-Continuous Load Current', type: 'number', value: 18, unit: 'A', min: 0, max: 3200, showIf: (v) => v.mode === 'feeder' },
      { id: 'flc', label: 'Motor Full-Load Current (FLC)', type: 'number', value: 28, unit: 'A', gt: 0, max: 1500, showIf: (v) => v.mode === 'motor' },
      { id: 'devType', label: 'Motor OCPD Device Type', type: 'select', value: 'itcb', options: [['itcb', 'Inverse-Time Circuit Breaker (250%)'], ['tdfuse', 'Dual-Element Time-Delay Fuse (175%)'], ['ntdfuse', 'Non-Time-Delay Fuse (300%)']], showIf: (v) => v.mode === 'motor' }
    ],
    compute(v) {
      if (v.mode === 'feeder') {
        if (v.contI + v.nonContI <= 0) return { error: 'Enter a continuous or non-continuous load greater than 0 A.' };
        const minOcpd = v.contI * 1.25 + v.nonContI;
        const std = nextStd(STD_OCPD, minOcpd);
        if (!std) return { error: 'Exceeds standard 4000 A OCPD table.' };
        const minCondCu = COND.find((c) => c.cu[1] >= (std > 800 ? std : minOcpd));
        const frame = std <= 100 ? '100 AF (MCB/MCCB)' : (std <= 250 ? '250 AF (MCCB)' : (std <= 600 ? '600 AF (MCCB)' : (std <= 800 ? '800 AF (MCCB)' : 'ACB / Drawout Frame')));
        return {
          rows: [
            row('Selected Standard OCPD', `${std} AT / ${v.poles}`, frame, 'ok', true),
            row('Minimum Calculated Rating', fmt(minOcpd, 1), 'A (1.25×Cont + Non-Cont)'),
            row('Total Connected Current', fmt(v.contI + v.nonContI, 1), 'A'),
            row('Min Copper Conductor (75 °C)', minCondCu ? `${minCondCu.lab} (${minCondCu.mm2} mm²)` : 'Parallel sets required', ''),
            row('Above-800A Rule Status', std > 800 ? 'Strict (Conductor ≥ OCPD)' : 'Next-size-up eligible (≤ 800 A)', '', std > 800 ? 'warn' : 'ok')
          ],
          notes: [
            'Confirm OCPD interrupting capacity (kAIC) exceeds the bolted fault current at the installation point.',
            'For 100%-rated breakers (listed assembly), the 125% continuous multiplier may be waived per manufacturer listing.'
          ]
        };
      } else {
        const mult = v.devType === 'itcb' ? 2.5 : (v.devType === 'tdfuse' ? 1.75 : 3.0);
        const maxAllow = v.flc * mult;
        const std = nextStd(STD_OCPD, maxAllow);
        const minWireI = v.flc * 1.25;
        const minCondCu = COND.find((c) => c.cu[1] >= minWireI);
        const olMax = v.flc * 1.15;
        return {
          rows: [
            row('Max Standard Motor OCPD', std ? `${std} AT / ${v.poles}` : 'Custom', `(${mult * 100}% FLC rule)`, 'ok', true),
            row('Calculated Max OCPD (Exact)', fmt(maxAllow, 1), 'A'),
            row('Min Motor Conductor Ampacity', fmt(minWireI, 1), 'A (125% FLC)'),
            row('Min Copper Conductor (75 °C)', minCondCu ? `${minCondCu.lab} (${minCondCu.mm2} mm²)` : 'Parallel sets', ''),
            row('Running Overload Relay Setting', `≤ ${fmt(olMax, 1)} A`, '(115% FLC; 125% if SF ≥ 1.15)')
          ],
          notes: [
            'Short-circuit & ground-fault protection is handled by the breaker/fuse; running thermal protection must be provided by a coordinated overload relay.'
          ]
        };
      }
    }
  }]
});

/* ===== MODULE 6: Load Balancing in 3-Phase Systems ===== */
MODULES.push({
  id: 'balance', num: 6, cat: '3-Phase Systems',
  title: 'Load Balancing in 3-Phase Systems',
  short: 'Interactive 3-phase panelboard load balancer: phase totals, % unbalance, neutral current estimate, and one-click auto-rebalance.',
  tags: ['Unbalance ≤ 10%', 'Neutral Current', 'Auto-Rebalance'],
  guide: [
    { h: 'Why 3-Phase Balance Matters', items: [
      'Unbalanced phase loading increases neutral return current, creates uneven voltage drop across phases, and reduces available transformer/generator capacity.',
      'Target <strong>≤ 10% maximum phase unbalance</strong> at panelboards and <strong>≤ 5%</strong> at main transformers and standby generators.',
      'Distribute single-phase circuits in A–B–C sequence and balance by actual <strong>demand load</strong>, paying special attention to large 2026 single-phase loads (EVSE, induction cooktops, heat pumps).',
      'With high non-linear loads (LED drivers, IT racks), triplen harmonics add in the neutral — size neutral conductors up to 100–200% of phase conductors where harmonic content is significant.'
    ] }
  ],
  formulas: [
    { n: 'Percent Phase Unbalance', e: 'Unbalance % = (max |P_i − P_avg| / P_avg) × 100', t: 'P_avg = (Phase A + Phase B + Phase C) / 3' },
    { n: 'Linear Neutral Current', e: 'I_N = √(Ia² + Ib² + Ic² − Ia·Ib − Ib·Ic − Ic·Ia)', t: 'Add harmonic allowance for non-linear loads' }
  ],
  tables: [
    { title: '3-Phase Unbalance Assessment Criteria', head: ['Max Unbalance', 'Rating', 'Engineering Action'],
      rows: [
        ['≤ 5%', 'Excellent', 'Optimal balance for transformers & generators'],
        ['5% – 10%', 'Acceptable', 'Meets typical panelboard design standard'],
        ['10% – 20%', 'Unbalanced', 'Reassign circuits from heaviest to lightest phase'],
        ['> 20%', 'Severe', 'Immediate rebalancing required; verify neutral sizing']
      ] }
  ],
  calcs: [{ id: 'balancer', title: 'Interactive 3-Phase Panelboard Load Balancer', custom: 'balancer' }]
});

/* ===== MODULE 7: Electrical Equipment Sizing ===== */
MODULES.push({
  id: 'equipment', num: 7, cat: 'Equipment',
  title: 'Electrical Equipment Sizing',
  short: 'Distribution transformer kVA, standby generator kVA/kW (with motor starting headroom), MDP busbar, and disconnect switch sizing.',
  tags: ['Transformer kVA', 'Generator', 'MDP Busbar', 'Disconnect'],
  guide: [
    { h: '2026 Major Equipment Sizing Guidelines', items: [
      '<strong>Distribution Transformers:</strong> Size on net demand kVA plus 20–30% future growth so initial design loading lands at <strong>65–80%</strong> for peak efficiency and thermal longevity.',
      '<strong>Standby Generators:</strong> Account for continuous running load (typically 0.80 PF rating) PLUS the largest locked-rotor motor starting kVA step to avoid excessive voltage dip during transfer.',
      '<strong>MDP Busbar & Main Switchgear:</strong> Size main busbar ≥ 125% of continuous demand + 100% non-continuous + spare capacity; verify bracing (kA rms sym) exceeds available fault current.'
    ] }
  ],
  formulas: [
    { n: 'Transformer Required kVA', e: 'kVA_req = (kW_demand / PF) × (1 + Growth%)', t: 'Select next standard kVA rating' },
    { n: 'Transformer Secondary FLA', e: 'I_sec = (kVA × 1000) / (√3 × V_LL)', t: '3-phase secondary full-load current' },
    { n: 'Generator Sizing Check', e: 'kVA_gen ≥ max(Running_kVA / 0.85, Base_kVA + Motor_Start_kVA × 0.35)', t: 'Checks both running and step-load starting' }
  ],
  tables: [
    { title: 'Standard 3-Phase Distribution Transformer Sizes', head: ['Class', 'Standard Ratings (kVA)'],
      rows: [
        ['Small Commercial', '15, 30, 45, 75, 112.5, 150'],
        ['Medium Commercial / Industrial', '225, 300, 500, 750, 1000'],
        ['Large Substation', '1250, 1500, 2000, 2500, 3000']
      ] }
  ],
  calcs: [
    {
      id: 'xfmr', title: 'Distribution Transformer Sizing',
      intro: 'Selects standard 3-phase transformer kVA with future growth allowance, loading percentage, and primary/secondary FLA.',
      fields: [
        { id: 'kw', label: 'Net Demand Load', type: 'number', value: 280, unit: 'kW', gt: 0, max: 20000 },
        { id: 'pf', label: 'Demand Power Factor', type: 'number', value: 0.90, step: '0.01', gt: 0.4, max: 1.0 },
        { id: 'growth', label: 'Future Growth Allowance', type: 'number', value: 25, unit: '%', min: 0, max: 100 },
        { id: 'vPrim', label: 'Primary Line Voltage', type: 'number', value: 13800, unit: 'V', gt: 100, max: 69000 },
        { id: 'vSec', label: 'Secondary Line Voltage', type: 'number', value: 400, unit: 'V', gt: 100, max: 5000 }
      ],
      compute(v) {
        const demandKva = v.kw / v.pf;
        const designKva = demandKva * (1 + v.growth / 100);
        const std = nextStd(STD_XFMR_KVA, designKva);
        if (!std) return { error: 'Exceeds 3000 kVA single transformer table.', hint: 'Split into dual/multiple substations.' };
        const initLoadPct = (demandKva / std) * 100;
        const futureLoadPct = (designKva / std) * 100;
        const iPrim = (std * 1000) / (SQRT3 * v.vPrim);
        const iSec = (std * 1000) / (SQRT3 * v.vSec);
        const st = initLoadPct <= 80 ? 'ok' : (initLoadPct <= 90 ? 'warn' : 'err');
        return {
          rows: [
            row('Recommended Transformer', `${std} kVA (3-Phase)`, '', 'ok', true),
            row('Initial Demand / Design kVA', `${fmt(demandKva, 1)} / ${fmt(designKva, 1)}`, 'kVA'),
            row('Initial Operating Load', `${fmt(initLoadPct, 1)} %`, '(target 60–80%)', st),
            row('Future Loading (with Growth)', `${fmt(futureLoadPct, 1)} %`, ''),
            row('Primary Full-Load Current', fmt(iPrim, 1), `A @ ${v.vPrim} V`),
            row('Secondary Full-Load Current', fmt(iSec, 1), `A @ ${v.vSec} V`)
          ],
          bars: [
            { label: 'Initial Transformer Loading', value: initLoadPct, text: `${fmt(initLoadPct, 1)}% of ${std} kVA`, status: st }
          ],
          notes: ['Specify low-loss core design and verify impedance (%Z, typically 4–6%) for downstream short-circuit fault calculations.']
        };
      }
    },
    {
      id: 'genset', title: 'Standby Generator & MDP Busbar Sizing',
      intro: 'Sizes standby diesel/gas generator set (running + largest motor starting headroom) and main distribution panel busbar & disconnect.',
      fields: [
        { id: 'runKw', label: 'Emergency / Standby Running Load', type: 'number', value: 140, unit: 'kW', gt: 0, max: 10000 },
        { id: 'pf', label: 'Running Power Factor', type: 'number', value: 0.85, step: '0.01', gt: 0.5, max: 1.0 },
        { id: 'motorHp', label: 'Largest Motor Started on Gen', type: 'number', value: 30, unit: 'HP', min: 0, max: 1000, help: 'Enter 0 if no large motor load' },
        { id: 'startMethod', label: 'Motor Starting Method', type: 'select', value: 'vfd', options: [['dol', 'Direct-On-Line (6× LRA)'], ['yd', 'Wye-Delta / Soft Starter (3×)'], ['vfd', 'VFD / Inverter Drive (1.5×)']] },
        { id: 'volts', label: '3-Phase Distribution Voltage', type: 'number', value: 400, unit: 'V', gt: 100, max: 5000 }
      ],
      compute(v) {
        const runKva = v.runKw / v.pf;
        const motorKva = v.motorHp * 0.95;
        const startMult = v.startMethod === 'dol' ? 6.0 : (v.startMethod === 'yd' ? 3.0 : 1.5);
        const startStepKva = motorKva * startMult;
        const reqRunGen = Math.max(v.runKw / 0.80, runKva) * 1.15;
        const reqStartGen = (runKva - motorKva) + startStepKva * 0.40;
        const reqKva = Math.max(reqRunGen, reqStartGen);
        const stdGen = nextStd(STD_GEN_KVA, reqKva);
        const genKw = stdGen ? stdGen * 0.80 : 0;
        const fla = (runKva * 1000) / (SQRT3 * v.volts);
        const busbar = nextStd(STD_BUSBAR, fla * 1.25);
        const disc = nextStd(STD_DISCONNECT, fla * 1.25);
        return {
          rows: [
            row('Recommended Standby Generator', stdGen ? `${stdGen} kVA / ${fmt(genKw, 0)} kW` : 'Parallel Sets Required', '@ 0.80 PF Standby', 'ok', true),
            row('Running Apparent Load', fmt(runKva, 1), 'kVA'),
            row('Largest Motor Starting Surge', fmt(startStepKva, 1), 'kVA (inrush)'),
            row('Minimum Calculated Gen Rating', fmt(reqKva, 1), 'kVA'),
            row('Recommended MDP Main Busbar', busbar ? `${busbar} A (3P+N+G)` : 'Custom > 4000 A', 'Copper bus'),
            row('Recommended Disconnect Switch', disc ? `${disc} A (3P)` : 'ACB / Custom', '(≥ 125% running FLA)')
          ],
          notes: [
            v.startMethod === 'dol' && v.motorHp >= 25 ? 'Consider VFD or soft-starter for large motors on backup power to substantially reduce generator frame size.' : 'Motor starting step is well managed for standby transfer.'
          ]
        };
      }
    }
  ]
});

/* ===== MODULE 8: Ground Wire Sizing (EGC & GEC) ===== */
MODULES.push({
  id: 'grounding', num: 8, cat: 'Safety & Grounding',
  title: 'Ground Wire Sizing (EGC & GEC)',
  short: 'Equipment Grounding Conductor (EGC) by upstream OCPD (with V-drop upsizing check) and Grounding Electrode Conductor (GEC) sizing.',
  tags: ['EGC Table', 'GEC Sizing', 'V-Drop Upsize'],
  guide: [
    { h: 'Grounding & Bonding Design Rules', items: [
      '<strong>Equipment Grounding Conductor (EGC):</strong> Sized from the upstream OCPD rating protecting the circuit. Never smaller than the code table minimum, and never required to be larger than the circuit ungrounded conductors.',
      '<strong>Proportional Voltage-Drop Upsizing Rule:</strong> Whenever ungrounded circuit conductors are increased in circular-mil area to compensate for voltage drop, the EGC MUST be increased proportionally in cross-sectional area.',
      '<strong>Grounding Electrode Conductor (GEC):</strong> Sized according to the largest ungrounded service-entrance conductor (or equivalent area for parallel sets). Copper GEC to a sole ground rod need not exceed 6 AWG (13.3 mm²) under typical code exceptions.'
    ] }
  ],
  formulas: [
    { n: 'Proportional EGC Upsizing', e: 'A_EGC,new = A_EGC,base × (A_phase,installed / A_phase,min)', t: 'Required whenever phase wires are upsized for voltage drop' }
  ],
  tables: [
    { title: 'Minimum Equipment Grounding Conductor (EGC) by OCPD', head: ['Max OCPD (A)', 'Copper EGC', 'Cu mm²', 'Aluminum EGC', 'Al mm²'], num: [0, 2, 4],
      rows: EGC_TABLE.map(([a, cu, al]) => [a, CONDMAP[cu].lab, CONDMAP[cu].mm2, CONDMAP[al].lab, CONDMAP[al].mm2]) }
  ],
  calcs: [
    {
      id: 'egc', title: 'Equipment Grounding Conductor (EGC) Calculator',
      intro: 'Sizes EGC based on upstream OCPD rating and checks proportional upsizing when phase conductors were enlarged for voltage drop.',
      fields: [
        { id: 'ocpd', label: 'Upstream OCPD Rating', type: 'number', value: 100, unit: 'A', gt: 0, max: 4000 },
        { id: 'mat', label: 'EGC Material', type: 'select', value: 'cu', options: [['cu', 'Copper (Cu)'], ['al', 'Aluminum (Al)']] },
        { id: 'upsized', label: 'Were Phase Conductors Upsized for Voltage Drop?', type: 'select', value: 'no', options: [['no', 'No (Standard Sizing)'], ['yes', 'Yes (Apply Proportional Upsize)']] },
        { id: 'minPhase', label: 'Minimum Ampacity Phase Size', type: 'select', value: '3', options: condOptions(0), showIf: (v) => v.upsized === 'yes' },
        { id: 'instPhase', label: 'Actual Installed Phase Size', type: 'select', value: '1', options: condOptions(0), showIf: (v) => v.upsized === 'yes' }
      ],
      compute(v) {
        const entry = EGC_TABLE.find(([maxA]) => v.ocpd <= maxA);
        if (!entry) return { error: 'OCPD exceeds 4000 A table limit.' };
        const baseKey = v.mat === 'cu' ? entry[1] : entry[2];
        const baseCond = CONDMAP[baseKey];
        let finalCond = baseCond;
        let ratio = 1;
        if (v.upsized === 'yes') {
          const cMin = CONDMAP[v.minPhase];
          const cInst = CONDMAP[v.instPhase];
          ratio = Math.max(1, cInst.mm2 / cMin.mm2);
          const reqMm2 = baseCond.mm2 * ratio;
          const up = COND.find((c) => (v.mat === 'cu' || c.al) && c.mm2 >= reqMm2 - 1e-6);
          if (up) finalCond = up.mm2 > cInst.mm2 ? cInst : up;
        }
        return {
          rows: [
            row('Recommended EGC Size', `${finalCond.lab} (${finalCond.mm2} mm²)`, `Nearest Metric: ${finalCond.met} mm²`, 'ok', true),
            row('Base Table EGC (for ' + v.ocpd + ' A)', `${baseCond.lab} (${baseCond.mm2} mm²)`, v.mat === 'cu' ? 'Copper' : 'Aluminum'),
            row('Voltage-Drop Upsize Multiplier', `${fmt(ratio, 2)}×`, ratio > 1 ? 'Proportional upsize applied' : 'Not required', ratio > 1 ? 'warn' : 'ok')
          ],
          notes: [
            'Verify continuity of metallic raceways and bonding jumpers; target overall facility earth-electrode resistance ≤ 5 Ω (or ≤ 1–2 Ω for sensitive data/healthcare sites).'
          ]
        };
      }
    },
    {
      id: 'gec', title: 'Grounding Electrode Conductor (GEC) Calculator',
      intro: 'Sizes the main service GEC from the largest ungrounded service-entrance conductor (supports parallel feeder sets).',
      fields: [
        { id: 'svcMat', label: 'Service Conductor Material', type: 'select', value: 'cu', options: [['cu', 'Copper Service Conductors'], ['al', 'Aluminum Service Conductors']] },
        { id: 'svcSize', label: 'Service Conductor Size (per set)', type: 'select', value: '3/0', options: condOptions(4) },
        { id: 'sets', label: 'Parallel Sets per Phase', type: 'number', value: 1, step: 1, min: 1, max: 12 },
        { id: 'gecMat', label: 'GEC Material', type: 'select', value: 'cu', options: [['cu', 'Copper GEC'], ['al', 'Aluminum GEC']] }
      ],
      compute(v) {
        const svc = CONDMAP[v.svcSize];
        const eqMm2 = svc.mm2 * v.sets;
        const entry = GEC_TABLE.find((r) => eqMm2 <= (v.svcMat === 'cu' ? r[0] : r[1])) || GEC_TABLE[GEC_TABLE.length - 1];
        const gecKey = v.gecMat === 'cu' ? entry[2] : entry[3];
        const gec = CONDMAP[gecKey];
        return {
          rows: [
            row('Recommended GEC Size', `${gec.lab} (${gec.mm2} mm²)`, `Nearest Metric: ${gec.met} mm²`, 'ok', true),
            row('Equivalent Service Phase Area', `${fmt(eqMm2, 1)} mm²`, `(${v.sets} × ${svc.lab})`),
            row('GEC Material', v.gecMat === 'cu' ? 'Copper' : 'Aluminum', '')
          ],
          notes: [
            'Where connected solely to driven ground rods/pipes, copper GEC is typically capped at 6 AWG (13.3 mm²) per code exception; confirm with local utility & AHJ.'
          ]
        };
      }
    }
  ]
});

/* ===== MODULE 9: Instrument Transformers for Metering ===== */
MODULES.push({
  id: 'metering', num: 9, cat: 'Metering',
  title: 'Instrument Transformers for Metering',
  short: 'CT ratio selection, secondary lead + meter VA burden check (5 A vs 1 A), PT/VT ratio helper, accuracy classes, and shorting-block safety.',
  tags: ['CT Ratio', 'VA Burden', 'PT / VT', '0.2S / 0.5 Class'],
  callout: 'CRITICAL SAFETY RULE: NEVER open-circuit an energized Current Transformer (CT) secondary! Open CT secondaries generate dangerously high peak voltages that can destroy insulation and injure personnel. Always install shorting-type terminal test blocks and single-point secondary grounding.',
  guide: [
    { h: 'CT & PT Metering Design Essentials', items: [
      '<strong>CT Primary Selection:</strong> Choose a standard CT primary rating approximately <strong>125%–150%</strong> of full-load design current so normal operating load sits in the 40%–80% sweet spot of the accuracy curve.',
      '<strong>5 A vs 1 A Secondary:</strong> Use <strong>5 A</strong> secondaries for short meter runs inside switchgear (< 15 m). Switch to <strong>1 A</strong> secondaries for long control-room runs because lead losses scale with I²R (25× lower lead burden at 1 A!).',
      '<strong>Burden Check:</strong> Total connected VA (meter coil + round-trip lead wire I²R) must remain at or below the CT rated burden (e.g., 2.5, 5, 10, 15 VA) to preserve accuracy class.',
      '<strong>Accuracy Classes:</strong> Specify <strong>0.2S / 0.2</strong> for revenue utility billing, <strong>0.5</strong> for commercial sub-metering & EMS, and <strong>1.0</strong> for basic panel indication.'
    ] }
  ],
  formulas: [
    { n: 'CT Lead Burden (VA)', e: 'VA_lead = I_sec² × (2 × L × ρ / A_wire)', t: 'Round-trip secondary wire resistance × I_sec²' },
    { n: 'Total CT Burden', e: 'VA_total = VA_meter + VA_lead ≤ VA_rated', t: 'Keep ≤ 80% of rated CT burden for safety margin' },
    { n: 'Overall Metering Multiplier', e: 'K_meter = (CT_primary / CT_sec) × (PT_primary / PT_sec)', t: 'Multiply raw meter kWh by K_meter' }
  ],
  tables: [
    { title: 'Metering Accuracy Classes & Applications', head: ['Class', 'Typical Application', 'Wiring Note'],
      rows: [
        ['0.2S / 0.2', 'Utility revenue & high-precision billing', '3P4W (3 CTs) or 3P3W (2 CTs); dedicated metering core'],
        ['0.5', 'Commercial sub-metering & 2026 EMS / Modbus', 'Check lead VA burden; keep shorting blocks accessible'],
        ['1.0', 'Local ammeter / panelboard indication', 'General monitoring only; not for revenue billing']
      ] }
  ],
  calcs: [{
    id: 'ctpt', title: 'CT Ratio, Burden VA & PT Multiplier Calculator',
    intro: 'Selects standard CT ratio, checks round-trip lead + meter VA burden, and computes overall metering multiplier.',
    fields: [
      { id: 'fla', label: 'Circuit Full-Load Current (FLA)', type: 'number', value: 320, unit: 'A', gt: 1, max: 5000 },
      { id: 'ctSec', label: 'CT Secondary Rating', type: 'select', value: '5', options: [['5', '5 A Secondary (Local Panel)'], ['1', '1 A Secondary (Long Runs)']] },
      { id: 'ratedVa', label: 'CT Rated Burden', type: 'number', value: 10, unit: 'VA', gt: 0.5, max: 100 },
      { id: 'meterVa', label: 'Digital Meter + Relay Burden', type: 'number', value: 1.5, unit: 'VA', min: 0, max: 50 },
      { id: 'leadLen', label: 'One-Way CT Lead Length', type: 'number', value: 12, unit: 'm', min: 0.5, max: 500 },
      { id: 'leadWire', label: 'CT Secondary Wire Size (Cu)', type: 'select', value: '12', options: [['14', '14 AWG (2.08 mm²)'], ['12', '12 AWG (3.31 mm² / 2.5–4 mm²)'], ['10', '10 AWG (5.26 mm² / 6 mm²)'], ['8', '8 AWG (8.37 mm²)']] },
      { id: 'usePt', label: 'Include Potential Transformer (PT/VT)?', type: 'select', value: 'no', options: [['no', 'No (Direct LV Voltage Sensing)'], ['yes', 'Yes (Medium Voltage PT/VT)']] },
      { id: 'ptPrim', label: 'PT Primary Voltage', type: 'number', value: 13800, unit: 'V', gt: 100, max: 230000, showIf: (v) => v.usePt === 'yes' },
      { id: 'ptSec', label: 'PT Secondary Voltage', type: 'number', value: 115, unit: 'V', gt: 50, max: 240, showIf: (v) => v.usePt === 'yes' }
    ],
    compute(v) {
      const iSec = Number(v.ctSec);
      const targetPrim = v.fla * 1.25;
      const stdPrim = nextStd(STD_CT_PRIM, targetPrim) || STD_CT_PRIM[STD_CT_PRIM.length - 1];
      const ctRatio = stdPrim / iSec;
      const wire = CONDMAP[v.leadWire];
      const rLoop = (2 * v.leadLen * 0.0178) / wire.mm2; // Cu at ~25-30C
      const vaLead = iSec * iSec * rLoop;
      const vaTotal = vaLead + v.meterVa;
      const vaPct = (vaTotal / v.ratedVa) * 100;
      const ptRatio = v.usePt === 'yes' ? (v.ptPrim / v.ptSec) : 1;
      const kMult = ctRatio * ptRatio;
      const loadPct = (v.fla / stdPrim) * 100;
      const st = vaTotal <= v.ratedVa * 0.85 ? 'ok' : (vaTotal <= v.ratedVa ? 'warn' : 'err');
      return {
        rows: [
          row('Recommended CT Ratio', `${stdPrim} / ${iSec} A`, `(Ratio ${fmt(ctRatio, 1)}:1)`, 'ok', true),
          row('CT Operating Load Point', `${fmt(loadPct, 1)} %`, '(ideal 40–80%)', loadPct >= 30 && loadPct <= 85 ? 'ok' : 'warn'),
          row('Round-Trip Lead Burden', fmt(vaLead, 2), `VA (${fmt(rLoop, 3)} Ω)`),
          row('Total Connected CT Burden', `${fmt(vaTotal, 2)} VA`, `(rated ${v.ratedVa} VA)`, st),
          row('PT Ratio / Overall Meter Multiplier', `${fmt(ptRatio, 2)}:1  |  ×${fmt(kMult, 1)}`, '')
        ],
        bars: [
          { label: `CT Burden vs Rated (${v.ratedVa} VA)`, value: vaPct, text: `${fmt(vaTotal, 2)} / ${v.ratedVa} VA (${fmt(vaPct, 0)}%)`, status: st }
        ],
        notes: [
          vaTotal > v.ratedVa ? 'OVERBURDENED: Upsize CT secondary wire, choose a higher VA CT, or switch to a 1 A secondary CT.' : 'Total connected burden is safely within the CT rated VA.',
          'Install a shorting-type test switch/block and ground one side of the CT secondary at a single point.'
        ]
      };
    }
  }]
});

/* ---------- 4. Calculator UI Engine ---------- */
const lastRes = {};

function fieldHTML(f, key) {
  const id = `${key.replace('.', '-')}-${f.id}`;
  let ctl;
  if (f.type === 'select') {
    ctl = `<select id="${id}" name="${f.id}">${f.options.map((o) =>
      `<option value="${esc(o[0])}"${String(o[0]) === String(f.value) ? ' selected' : ''}>${esc(o[1])}</option>`
    ).join('')}</select>`;
  } else {
    ctl = `<input id="${id}" name="${f.id}" type="number" inputmode="decimal" step="${f.step ?? 'any'}" value="${esc(f.value ?? '')}" aria-describedby="${id}-err">`;
  }
  return `<div class="field" data-field="${f.id}">
    <label for="${id}">${esc(f.label)}${f.unit ? ` <span class="unit">(${esc(f.unit)})</span>` : ''}</label>
    ${ctl}
    ${f.help ? `<small class="help">${esc(f.help)}</small>` : ''}
    <small class="field-error" id="${id}-err" role="alert"></small>
  </div>`;
}

function collectValues(form, calc) {
  const vals = {};
  for (const f of calc.fields) {
    const el = form.elements[f.id];
    vals[f.id] = f.type === 'select' ? el.value : (el.value.trim() === '' ? NaN : Number(el.value));
  }
  return vals;
}

function validateForm(form, calc, vals) {
  let bad = 0;
  let first = null;
  for (const f of calc.fields) {
    const wrap = $(`[data-field="${f.id}"]`, form);
    const el = form.elements[f.id];
    const err = $('.field-error', wrap);
    const visible = !f.showIf || f.showIf(vals);
    wrap.hidden = !visible;
    err.textContent = '';
    el.removeAttribute('aria-invalid');
    if (!visible || f.type === 'select') continue;
    const x = vals[f.id];
    let msg = '';
    if (!Number.isFinite(x)) msg = 'Enter a valid number.';
    else if (f.gt != null && !(x > f.gt)) msg = `Must be greater than ${f.gt}.`;
    else if (f.min != null && x < f.min) msg = `Must be at least ${f.min}.`;
    else if (f.max != null && x > f.max) msg = `Must be ${f.max} or less.`;
    else if (f.step === 1 && !Number.isInteger(x)) msg = 'Enter a whole number.';
    if (msg) {
      bad++;
      err.textContent = msg;
      el.setAttribute('aria-invalid', 'true');
      if (!first) first = el;
    }
  }
  return { bad, first };
}

function describeInputs(form, calc, vals) {
  return calc.fields.filter((f) => !f.showIf || f.showIf(vals)).map((f) => {
    const el = form.elements[f.id];
    const value = f.type === 'select' ? el.options[el.selectedIndex].text : el.value;
    return { label: f.label, value, unit: f.type === 'select' ? '' : (f.unit || '') };
  });
}

function statusBadge(s) {
  if (!s) return '';
  const lbl = s === 'ok' ? 'PASS' : (s === 'warn' ? 'CHECK' : 'OVERLOAD');
  return `<span class="badge ${s}">${lbl}</span>`;
}

function formatPlainSummary(entry) {
  const lines = [
    `2026 Electrical Design Guide — ${entry.mod}`,
    `Calculator: ${entry.calc}`,
    entry.label ? `Project / Circuit: ${entry.label}` : '',
    `Timestamp: ${new Date().toLocaleString()}`,
    '--- INPUTS ---',
    ...entry.inputs.map((i) => `• ${i.label}: ${i.value}${i.unit ? ' ' + i.unit : ''}`),
    '--- RESULTS ---',
    ...entry.res.rows.map((r) => `• ${r.k}: ${r.v}${r.u ? ' ' + r.u : ''}${r.s ? ' [' + r.s.toUpperCase() + ']' : ''}`)
  ].filter(Boolean);
  return lines.join('\n');
}

function renderResult(box, key, mod, calc, inputs, res) {
  box.dataset.key = key;
  if (res.error) {
    delete lastRes[key];
    box.innerHTML = `<div class="res-error" role="alert">${esc(res.error)}${res.hint ? `<small>${esc(res.hint)}</small>` : ''}</div>`;
    return;
  }
  lastRes[key] = { mod: mod.title, calc: calc.title, mid: mod.id, inputs, res };
  const rowsHtml = res.rows.map((r) =>
    `<div class="res-row${r.big ? ' big' : ''}">
      <dt>${esc(r.k)}</dt>
      <dd><span>${esc(r.v)}</span>${r.u ? `<span class="u">${esc(r.u)}</span>` : ''}${statusBadge(r.s)}</dd>
    </div>`
  ).join('');
  const barsHtml = (res.bars || []).map((b) => {
    const pct = clamp(b.value, 0, 100);
    return `<div class="meter">
      <div class="meter-head"><span>${esc(b.label)}</span><span class="mono">${esc(b.text)}</span></div>
      <div class="meter-track"><div class="meter-fill ${esc(b.status || '')}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  const notesHtml = (res.notes && res.notes.length)
    ? `<ul class="res-notes">${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : '';
  box.innerHTML = `
    <dl class="res-list">${rowsHtml}</dl>
    ${barsHtml ? `<div class="meter-list">${barsHtml}</div>` : ''}
    ${notesHtml}
    <div class="res-toolbar">
      <button type="button" class="btn btn-sm btn-primary" data-save-key="${esc(key)}">Save to Project</button>
      <button type="button" class="btn btn-sm btn-outline" data-copy-key="${esc(key)}">Copy Summary</button>
      <button type="button" class="btn btn-sm btn-outline" onclick="window.print()">Print Sheet</button>
    </div>`;
}

function mountStandardCalc(container, mod, calc) {
  const key = `${mod.id}.${calc.id}`;
  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML = `
    <h2>${esc(calc.title)}</h2>
    <p class="card-intro">${esc(calc.intro)}</p>
    <div class="calc-layout">
      <form class="calc-form" novalidate>
        <div class="form-grid">${calc.fields.map((f) => fieldHTML(f, key)).join('')}</div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Calculate</button>
          <button type="reset" class="btn btn-outline">Reset Defaults</button>
        </div>
      </form>
      <div class="result-panel" aria-live="polite"></div>
    </div>`;
  container.appendChild(card);

  const form = $('.calc-form', card);
  const resBox = $('.result-panel', card);

  const run = (focusErr = false) => {
    const vals = collectValues(form, calc);
    const { bad, first } = validateForm(form, calc, vals);
    if (bad > 0) {
      if (focusErr && first) first.focus();
      resBox.innerHTML = `<div class="res-error" role="alert">Please fix ${bad} highlighted input${bad > 1 ? 's' : ''} above.</div>`;
      return;
    }
    const res = calc.compute(vals);
    renderResult(resBox, key, mod, calc, describeInputs(form, calc, vals), res);
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); run(true); });
  form.addEventListener('change', (e) => {
    if (typeof calc.onFieldChange === 'function' && e.target.name) {
      const vals = collectValues(form, calc);
      calc.onFieldChange(e.target.name, vals, form);
    }
    run(false);
  });
  form.addEventListener('reset', () => {
    setTimeout(() => run(false), 10);
  });

  run(false);
}

/* ---------- 5. Interactive 3-Phase Load Balancer Engine ---------- */
const DEFAULT_CIRCUITS = [
  { id: 'c1', label: 'Lighting Zone A', val: 3200, phase: 'A' },
  { id: 'c2', label: 'General Receptacles', val: 4500, phase: 'A' },
  { id: 'c3', label: 'Split AC Unit 1', val: 3800, phase: 'B' },
  { id: 'c4', label: 'Office Workstations', val: 2900, phase: 'B' },
  { id: 'c5', label: 'Water Heater / Pantry', val: 4200, phase: 'C' },
  { id: 'c6', label: 'EV Charger (1-Ph)', val: 7200, phase: 'A' }
];

function mountLoadBalancer(container, mod, calc) {
  const key = `${mod.id}.${calc.id}`;
  let state = store.get('balancer', { unit: 'VA', vln: 230, circuits: DEFAULT_CIRCUITS });
  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML = `
    <h2>${esc(calc.title)}</h2>
    <p class="card-intro">Add single-phase circuits, reassign phases A/B/C, inspect phase unbalance and neutral current, or click <strong>Auto-Rebalance</strong> to optimize instantly.</p>
    <div class="form-grid" style="margin-bottom:16px">
      <div class="field">
        <label for="bal-unit">Load Entry Unit</label>
        <select id="bal-unit"><option value="VA">Volt-Amperes (VA)</option><option value="A">Amperes (A)</option></select>
      </div>
      <div class="field">
        <label for="bal-vln">Line-to-Neutral Voltage (V_LN)</label>
        <input id="bal-vln" type="number" value="${state.vln}" min="100" max="600">
      </div>
    </div>
    <form id="bal-add-form" class="bal-add-row">
      <input name="label" type="text" placeholder="Circuit name (e.g., Lighting Floor 2)" required aria-label="Circuit name" style="min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg)">
      <input name="val" type="number" step="any" min="1" placeholder="Load" required aria-label="Circuit load" style="min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg)">
      <select name="phase" aria-label="Initial phase" style="min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg)">
        <option value="A">Phase A</option><option value="B">Phase B</option><option value="C">Phase C</option>
      </select>
      <button type="submit" class="btn btn-primary">Add Circuit</button>
    </form>
    <div class="calc-layout">
      <div>
        <div class="form-actions" style="margin-bottom:12px">
          <button type="button" id="bal-auto" class="btn btn-accent">Auto-Rebalance Phases</button>
          <button type="button" id="bal-reset" class="btn btn-sm btn-outline">Reset Sample Panel</button>
        </div>
        <div id="bal-circuits" class="circuit-list"></div>
      </div>
      <div id="bal-result" class="result-panel" aria-live="polite"></div>
    </div>`;
  container.appendChild(card);

  const unitEl = $('#bal-unit', card);
  const vlnEl = $('#bal-vln', card);
  const listEl = $('#bal-circuits', card);
  const resEl = $('#bal-result', card);
  unitEl.value = state.unit;

  const persist = () => store.set('balancer', state);

  const recalc = () => {
    const vln = Math.max(100, Number(vlnEl.value) || 230);
    state.vln = vln;
    state.unit = unitEl.value;
    persist();

    if (!state.circuits.length) {
      listEl.innerHTML = `<div class="empty-state" style="padding:24px"><p style="margin:0">No circuits yet. Add a circuit above to evaluate 3-phase balance.</p></div>`;
      resEl.innerHTML = `<div class="res-error">Add at least one circuit load to calculate phase balance.</div>`;
      return;
    }

    listEl.innerHTML = state.circuits.map((c) => `
      <div class="circuit-row" data-cid="${esc(c.id)}">
        <strong>${esc(c.label)}</strong>
        <span class="mono">${fmt(c.val, 1)} ${esc(state.unit)}</span>
        <select aria-label="Phase for ${esc(c.label)}" data-phase-id="${esc(c.id)}">
          <option value="A"${c.phase === 'A' ? ' selected' : ''}>Ph A</option>
          <option value="B"${c.phase === 'B' ? ' selected' : ''}>Ph B</option>
          <option value="C"${c.phase === 'C' ? ' selected' : ''}>Ph C</option>
        </select>
        <button type="button" class="icon-btn" data-del-cid="${esc(c.id)}" aria-label="Remove ${esc(c.label)}" style="width:40px;height:40px">×</button>
      </div>`).join('');

    const tot = { A: 0, B: 0, C: 0 };
    for (const c of state.circuits) tot[c.phase] += Number(c.val) || 0;
    const sum = tot.A + tot.B + tot.C;
    const avg = sum / 3;
    const maxDev = avg > 0 ? Math.max(Math.abs(tot.A - avg), Math.abs(tot.B - avg), Math.abs(tot.C - avg)) : 0;
    const unbalPct = avg > 0 ? (maxDev / avg) * 100 : 0;
    const ia = state.unit === 'VA' ? tot.A / vln : tot.A;
    const ib = state.unit === 'VA' ? tot.B / vln : tot.B;
    const ic = state.unit === 'VA' ? tot.C / vln : tot.C;
    const iNeu = Math.sqrt(Math.max(0, ia * ia + ib * ib + ic * ic - ia * ib - ib * ic - ic * ia));
    const maxPh = Math.max(tot.A, tot.B, tot.C, 1);
    const st = unbalPct <= 10 ? 'ok' : (unbalPct <= 20 ? 'warn' : 'err');
    const totalKva = state.unit === 'VA' ? sum / 1000 : (sum * vln) / 1000;

    const resObj = {
      rows: [
        row('Maximum Phase Unbalance', `${fmt(unbalPct, 1)} %`, '(target ≤ 10%)', st, true),
        row('Phase A Total', `${fmt(tot.A, 1)} ${state.unit}`, `(${fmt(ia, 1)} A)`),
        row('Phase B Total', `${fmt(tot.B, 1)} ${state.unit}`, `(${fmt(ib, 1)} A)`),
        row('Phase C Total', `${fmt(tot.C, 1)} ${state.unit}`, `(${fmt(ic, 1)} A)`),
        row('Estimated Neutral Current (I_N)', fmt(iNeu, 1), 'A (linear)'),
        row('Total Connected 3-Phase Load', fmt(totalKva, 2), 'kVA')
      ],
      bars: [
        { label: `Phase A (${fmt(ia, 1)} A)`, value: (tot.A / maxPh) * 100, text: `${fmt(tot.A, 0)} ${state.unit}`, status: st },
        { label: `Phase B (${fmt(ib, 1)} A)`, value: (tot.B / maxPh) * 100, text: `${fmt(tot.B, 0)} ${state.unit}`, status: st },
        { label: `Phase C (${fmt(ic, 1)} A)`, value: (tot.C / maxPh) * 100, text: `${fmt(tot.C, 0)} ${state.unit}`, status: st }
      ],
      notes: [
        unbalPct > 10 ? 'Unbalance exceeds 10% — click "Auto-Rebalance Phases" to optimize circuit assignments.' : 'Panelboard phases are balanced within the ≤ 10% design target.'
      ]
    };

    const inputsSummary = [
      { label: 'Unit / V_LN', value: `${state.unit} @ ${vln} V`, unit: '' },
      { label: 'Circuit Count', value: String(state.circuits.length), unit: 'circuits' }
    ];
    renderResult(resEl, key, mod, calc, inputsSummary, resObj);
  };

  unitEl.addEventListener('change', recalc);
  vlnEl.addEventListener('input', recalc);

  $('#bal-add-form', card).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const label = f.elements.label.value.trim();
    const val = Number(f.elements.val.value);
    const phase = f.elements.phase.value;
    if (!label || !(val > 0)) return;
    state.circuits.push({ id: uid(), label, val, phase });
    f.reset();
    recalc();
    toast(`Added "${label}" to Phase ${phase}`);
  });

  listEl.addEventListener('change', (e) => {
    const cid = e.target.dataset.phaseId;
    if (!cid) return;
    const c = state.circuits.find((x) => x.id === cid);
    if (c) { c.phase = e.target.value; recalc(); }
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-cid]');
    if (!btn) return;
    state.circuits = state.circuits.filter((x) => x.id !== btn.dataset.delCid);
    recalc();
  });

  $('#bal-auto', card).addEventListener('click', () => {
    // Longest-Processing-Time (LPT) greedy bin-packing for near-optimal 3-phase balance
    const sorted = [...state.circuits].sort((a, b) => b.val - a.val);
    const sums = { A: 0, B: 0, C: 0 };
    for (const c of sorted) {
      const lightest = ['A', 'B', 'C'].reduce((best, p) => (sums[p] < sums[best] ? p : best), 'A');
      c.phase = lightest;
      sums[lightest] += c.val;
    }
    recalc();
    toast('Circuits automatically rebalanced across Phases A, B, and C.');
  });

  $('#bal-reset', card).addEventListener('click', () => {
    state.circuits = DEFAULT_CIRCUITS.map((c) => ({ ...c }));
    recalc();
    toast('Sample panelboard circuits restored.');
  });

  recalc();
}

/* ---------- 6. Views, Checklist, Saved Sheets & Router ---------- */
const REVIEW_GROUPS = [
  ['Design Basis & Documentation', [
    'Applicable 2026 electrical code edition, local utility rules, and AHJ amendments confirmed.',
    'Complete load schedule prepared with demand factors, 125% continuous loads, and spare capacity.',
    'Single-line diagram (SLD), riser diagram, and panel schedules cross-checked against calculations.',
    'Key design calculations saved with project/circuit tags and peer-reviewed.'
  ]],
  ['Illumination & Energy Efficiency', [
    'Maintained illuminance (lux) verified per space type with realistic LED Maintenance Factor & CU.',
    'Lighting Power Density (W/m²) complies with energy-code limits; dimming/occupancy controls specified.',
    'Emergency and egress lighting provided on dedicated tested circuits (≥ 90 min autonomy).'
  ]],
  ['Conductors, Conduits & Protection', [
    'Conductor ampacity verified with ambient temperature, conduit bundling, and 125% continuous rules.',
    'Voltage drop held ≤ 3% for branch circuits and ≤ 5% total feeder + branch.',
    'Conduit fill complies with 53% / 31% / 40% limits with ≤ 360° bends between pull points.',
    'OCPD ratings match standard sizes, conductor ampacity, and available short-circuit kAIC.',
    'EGC and GEC properly sized (including proportional EGC upsizing where phase wires were upsized for V-drop).'
  ]],
  ['3-Phase Systems, Equipment & Metering', [
    'Panelboard 3-phase loads balanced to ≤ 10% unbalance; neutral conductor checked for harmonics.',
    'Transformer initial design loading targets 60–80% with 20–30% growth allowance.',
    'Standby generator verified for both running kW and largest motor starting kVA step.',
    'CT ratios, accuracy class (0.2S / 0.5), VA burden, and shorting test blocks specified.'
  ]],
  ['2026 Future-Readiness', [
    'EV charging provisions (feeder capacity, spare conduit, load-management readiness) included.',
    'Solar PV / Battery Energy Storage (BESS) interconnection space and labeling reserved.',
    'Coordinated Type 1 / Type 2 / Type 3 Surge Protection Devices (SPDs) specified.',
    'Minimum 20% spare panelboard ways and 25% spare raceway capacity reserved.'
  ]]
];

const ALL_REVIEW_ITEMS = REVIEW_GROUPS.flatMap(([group, list], gi) =>
  list.map((text, ii) => ({ id: `qa-${gi}-${ii}`, group, text }))
);

function getSavedSheets() { return store.get('savedSheets', []); }
function setSavedSheets(arr) {
  store.set('savedSheets', arr);
  updateSavedBadges();
}
function updateSavedBadges() {
  const n = getSavedSheets().length;
  const side = $('#saved-count-side');
  const mob = $('#saved-count-mobile');
  if (side) { side.textContent = String(n); side.hidden = n === 0; }
  if (mob) { mob.hidden = n === 0; }
}

function renderSidebarModules(activeModId) {
  const host = $('#sidebar-modules');
  if (!host) return;
  host.innerHTML = MODULES.map((m) => `
    <a href="#/module/${m.id}" class="side-mod-link"${activeModId === m.id ? ' aria-current="page"' : ''}>
      <span class="mod-num-chip">${m.num}</span>
      <span>${esc(m.title)}</span>
    </a>`).join('');
}

function syncNavState(route, crumbText, modId = null) {
  $$('[data-route]').forEach((el) => {
    if (el.dataset.route === route) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  renderSidebarModules(modId);
  const crumb = $('#page-crumb');
  if (crumb) crumb.textContent = crumbText;
}

function moduleCardHTML(m) {
  return `<a href="#/module/${m.id}" class="mod-card">
    <div class="mod-card-top">
      <span class="mod-badge-num">MODULE 0${m.num}</span>
      <span class="tag">${esc(m.cat)}</span>
    </div>
    <h3>${esc(m.title)}</h3>
    <p>${esc(m.short)}</p>
    <div class="tag-list">${m.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
  </a>`;
}

function renderHome(main) {
  syncNavState('home', 'Overview');
  const savedCount = getSavedSheets().length;
  const qaState = store.get('qaChecklist', {});
  const qaDone = ALL_REVIEW_ITEMS.filter((i) => qaState[i.id]).length;
  const onboardDismissed = store.get('onboardDismissed', false);

  main.innerHTML = `
    <section class="hero-card">
      <div class="hero-inner">
        <div class="hero-eyebrow">2026 Electrical Engineering PWA · 100% Offline Ready</div>
        <h1>2026 Electrical Design Guide</h1>
        <p>Complete engineering reference and 9 interactive 1-phase &amp; 3-phase design calculators covering lighting, voltage drop, conduit fill, conductors, OCPD, panelboard load balancing, equipment, grounding, and CT/PT metering.</p>
        <div class="hero-actions">
          <a href="#/module/conductor" class="btn btn-primary">Open Conductor Sizing</a>
          <a href="#/calculators" class="btn btn-outline">Browse All 9 Modules</a>
        </div>
      </div>
    </section>

    ${!onboardDismissed ? `
    <section class="onboarding-banner" id="onboarding-banner" aria-label="Welcome guide">
      <div>
        <h2>Ready for Field &amp; Office Offline Use</h2>
        <p>Every formula, ampacity table, and calculator runs locally in your browser with zero internet required. Save calculation sheets under any project name and track quality checks in the 2026 QA Checklist.</p>
      </div>
      <button type="button" class="btn btn-sm btn-outline" id="dismiss-onboard">Got it</button>
    </section>` : ''}

    <div class="stats-row">
      <div class="stat-tile"><strong>9</strong><span>Design Modules</span></div>
      <div class="stat-tile"><strong>13</strong><span>Interactive Calculators</span></div>
      <div class="stat-tile"><strong>${savedCount}</strong><span>Saved Project Sheets</span></div>
      <div class="stat-tile"><strong>${qaDone}/${ALL_REVIEW_ITEMS.length}</strong><span>QA Checks Done</span></div>
    </div>

    <div class="section-head">
      <div>
        <h2>9 Core 2026 Electrical Design Modules</h2>
        <p>Jump straight into any engineering guide, reference table, or interactive calculator.</p>
      </div>
      <a href="#/standards" class="btn btn-sm btn-outline">2026 Design Standards →</a>
    </div>
    <div class="module-grid">${MODULES.map(moduleCardHTML).join('')}</div>`;

  const dismissBtn = $('#dismiss-onboard', main);
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      store.set('onboardDismissed', true);
      $('#onboarding-banner', main)?.remove();
    });
  }
}

function renderCalculators(main) {
  syncNavState('calculators', 'All 9 Design Modules');
  const cats = ['All', ...new Set(MODULES.map((m) => m.cat))];
  let activeCat = 'All';

  const draw = () => {
    const filtered = activeCat === 'All' ? MODULES : MODULES.filter((m) => m.cat === activeCat);
    main.innerHTML = `
      <div class="section-head">
        <div>
          <h2>All 9 Design Modules &amp; Calculators</h2>
          <p>Filter by discipline or open any module for formulas, tables, and live calculations.</p>
        </div>
      </div>
      <div class="chip-row" role="group" aria-label="Filter modules by category">
        ${cats.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === activeCat}">${esc(c)}</button>`).join('')}
      </div>
      <div class="module-grid">${filtered.map(moduleCardHTML).join('')}</div>`;
    $$('.chip', main).forEach((btn) => {
      btn.addEventListener('click', () => { activeCat = btn.dataset.cat; draw(); });
    });
  };
  draw();
}

function renderModule(main, modId) {
  const mod = MODULES.find((m) => m.id === modId) || MODULES[0];
  syncNavState('calculators', `Module ${mod.num}: ${mod.title}`, mod.id);
  const idx = MODULES.indexOf(mod);
  const prev = MODULES[idx - 1];
  const next = MODULES[idx + 1];

  main.innerHTML = `
    <div class="back-bar">
      <a href="#/calculators" class="btn btn-sm btn-outline">← All Modules</a>
      <div class="form-actions">
        ${prev ? `<a href="#/module/${prev.id}" class="btn btn-sm btn-outline">← M${prev.num}</a>` : ''}
        ${next ? `<a href="#/module/${next.id}" class="btn btn-sm btn-outline">M${next.num} →</a>` : ''}
      </div>
    </div>

    <header class="module-header">
      <span class="mod-badge-num">MODULE 0${mod.num} · ${esc(mod.cat)}</span>
      <h1>${esc(mod.title)}</h1>
      <p>${esc(mod.short)}</p>
      <div class="tag-list">${mod.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </header>

    ${mod.callout ? `<div class="callout-warn" role="note"><strong>Safety Notice:</strong> ${esc(mod.callout)}</div>` : ''}

    <div class="tab-bar" role="tablist" aria-label="Module views">
      <button type="button" class="tab-btn" role="tab" data-tab="calc" aria-selected="true">Interactive Calculator</button>
      <button type="button" class="tab-btn" role="tab" data-tab="guide" aria-selected="false">2026 Design Guide</button>
      <button type="button" class="tab-btn" role="tab" data-tab="ref" aria-selected="false">Formulas &amp; Tables</button>
    </div>

    <div id="tab-calc"></div>
    <div id="tab-guide" hidden></div>
    <div id="tab-ref" hidden></div>`;

  const calcHost = $('#tab-calc', main);
  for (const calc of mod.calcs) {
    if (calc.custom === 'balancer') mountLoadBalancer(calcHost, mod, calc);
    else mountStandardCalc(calcHost, mod, calc);
  }

  $('#tab-guide', main).innerHTML = mod.guide.map((g) => `
    <section class="card">
      <h2>${esc(g.h)}</h2>
      <ul class="guide-list">${g.items.map((item) => `<li>${item}</li>`).join('')}</ul>
    </section>`).join('');

  const formulasHtml = `<section class="card">
    <h2>Key Engineering Formulas</h2>
    <div class="formula-grid">
      ${mod.formulas.map((f) => `
        <div class="formula-card">
          <h4>${esc(f.n)}</h4>
          <code class="formula-eq">${esc(f.e)}</code>
          <p>${esc(f.t)}</p>
        </div>`).join('')}
    </div>
  </section>`;

  const tablesHtml = (mod.tables || []).map((t) => `
    <section class="card">
      <h2>${esc(t.title)}</h2>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${t.head.map((h, ci) => `<th class="${(t.num || []).includes(ci) ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${t.rows.map((r) => `<tr>${r.map((cell, ci) => `<td class="${(t.num || []).includes(ci) ? 'num' : ''}">${esc(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${t.note ? `<p class="table-note">${esc(t.note)}</p>` : ''}
    </section>`).join('');

  $('#tab-ref', main).innerHTML = formulasHtml + tablesHtml;

  $$('.tab-btn', main).forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      $$('.tab-btn', main).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === target)));
      $('#tab-calc', main).hidden = target !== 'calc';
      $('#tab-guide', main).hidden = target !== 'guide';
      $('#tab-ref', main).hidden = target !== 'ref';
    });
  });
}

function renderStandards(main) {
  syncNavState('standards', '2026 Electrical Design Standards');
  main.innerHTML = `
    <div class="section-head">
      <div>
        <h2>2026 Electrical Design Standards &amp; Quick Summary</h2>
        <p>Core engineering limits, future-readiness benchmarks, and quick formulas consolidated for rapid reference.</p>
      </div>
      <a href="#/checklist" class="btn btn-sm btn-primary">Open QA Checklist</a>
    </div>

    <section class="card">
      <h2>Core 2026 Design Benchmarks</h2>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Parameter</th><th>2026 Target / Limit</th><th>Reference Module</th></tr></thead>
          <tbody>
            <tr><td>Branch Circuit Voltage Drop</td><td class="num">≤ 3.0 %</td><td><a href="#/module/general">Module 2</a> · <a href="#/module/conductor">Module 4</a></td></tr>
            <tr><td>Total Feeder + Branch Voltage Drop</td><td class="num">≤ 5.0 %</td><td><a href="#/module/general">Module 2</a> · <a href="#/module/conductor">Module 4</a></td></tr>
            <tr><td>Continuous Load Multiplier (≥ 3 hrs)</td><td class="num">125 %</td><td><a href="#/module/conductor">Module 4</a> · <a href="#/module/ocpd">Module 5</a></td></tr>
            <tr><td>Conduit Fill (1 / 2 / 3+ Conductors)</td><td class="num">53% / 31% / 40%</td><td><a href="#/module/conduit">Module 3</a></td></tr>
            <tr><td>3-Phase Panelboard Unbalance</td><td class="num">≤ 10 % (≤ 5% XFMR)</td><td><a href="#/module/balance">Module 6</a></td></tr>
            <tr><td>Transformer Initial Design Loading</td><td class="num">60 – 80 %</td><td><a href="#/module/equipment">Module 7</a></td></tr>
            <tr><td>LED Lighting Power Density (Offices)</td><td class="num">≤ 7.5 W/m²</td><td><a href="#/module/illumination">Module 1</a></td></tr>
            <tr><td>Facility Power Factor Target</td><td class="num">≥ 0.90 – 0.95</td><td><a href="#/module/general">Module 2</a></td></tr>
            <tr><td>Spare Panel Ways / Spare Raceway</td><td class="num">≥ 20% / ≥ 25%</td><td><a href="#/checklist">QA Checklist</a></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>2026 Emerging Infrastructure Provisions</h2>
      <ul class="guide-list">
        <li><strong>EV Charging Readiness:</strong> Dedicate spare feeder capacity or dynamic load management (EVEMS) for Level 2 AC chargers (7.4 kW 1-ph / 11–22 kW 3-ph), plus continuous 125% conductor/OCPD sizing.</li>
        <li><strong>Solar PV &amp; BESS Integration:</strong> Reserve main busbar capacity, bi-directional metering space, rapid shutdown disconnects, and clear backfeed warning labels.</li>
        <li><strong>Coordinated Surge Protection (SPD):</strong> Apply Type 1/Type 2 SPDs at service entrance and Type 2/Type 3 downstream for sensitive electronics and LED drivers.</li>
        <li><strong>Digital Sub-Metering:</strong> Specify 0.5-class CTs with shorting test blocks and Modbus/BACnet-ready meters on major lighting, HVAC, and tenant feeders.</li>
      </ul>
    </section>`;
}

function renderSaved(main) {
  syncNavState('saved', 'Saved Design Sheets');
  const sheets = getSavedSheets();

  if (!sheets.length) {
    main.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Saved Project Calculations</h2>
          <p>All saved sheets are stored locally on your device for offline access.</p>
        </div>
      </div>
      <div class="empty-state">
        <h3>No Saved Design Sheets Yet</h3>
        <p>Run any of the 9 electrical design calculators and click <strong>Save to Project</strong> to store labeled calculation records for export or printing.</p>
        <a href="#/calculators" class="btn btn-primary">Explore 9 Calculators</a>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Saved Project Calculations (${sheets.length})</h2>
        <p>Stored offline on this device. Export a plain-text engineering record or print a clean calculation report.</p>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-sm btn-outline" id="export-all-saved">Export All (.txt)</button>
        <button type="button" class="btn btn-sm btn-outline" onclick="window.print()">Print Report</button>
        <button type="button" class="btn btn-sm btn-danger" id="clear-all-saved">Clear All</button>
      </div>
    </div>
    <div id="saved-list">
      ${sheets.map((s) => `
        <article class="saved-card" data-sid="${esc(s.id)}">
          <div class="saved-head">
            <div>
              <h3 style="margin:0 0 2px">${esc(s.label)}</h3>
              <div class="saved-meta">${esc(s.mod)} · ${esc(s.calc)} · ${esc(new Date(s.at).toLocaleString())}</div>
            </div>
            <div class="form-actions">
              <a href="#/module/${esc(s.mid)}" class="btn btn-sm btn-outline">Open Module</a>
              <button type="button" class="btn btn-sm btn-outline" data-copy-sid="${esc(s.id)}">Copy</button>
              <button type="button" class="btn btn-sm btn-danger" data-del-sid="${esc(s.id)}">Delete</button>
            </div>
          </div>
          <dl class="res-list">
            ${s.res.rows.map((r) => `
              <div class="res-row${r.big ? ' big' : ''}">
                <dt>${esc(r.k)}</dt>
                <dd><span>${esc(r.v)}</span>${r.u ? `<span class="u">${esc(r.u)}</span>` : ''}${statusBadge(r.s)}</dd>
              </div>`).join('')}
          </dl>
        </article>`).join('')}
    </div>`;

  $('#export-all-saved', main).addEventListener('click', () => {
    const out = sheets.map((s) => formatPlainSummary(s)).join('\n\n========================================\n\n');
    downloadText('2026-electrical-design-sheets.txt', out);
    toast('Exported saved design sheets.');
  });

  $('#clear-all-saved', main).addEventListener('click', () => {
    if (confirm('Delete all saved calculation sheets from this device?')) {
      setSavedSheets([]);
      renderSaved(main);
      toast('All saved sheets cleared.');
    }
  });

  $('#saved-list', main).addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-del-sid]');
    if (delBtn) {
      setSavedSheets(sheets.filter((x) => x.id !== delBtn.dataset.delSid));
      renderSaved(main);
      toast('Saved sheet removed.');
      return;
    }
    const cpBtn = e.target.closest('[data-copy-sid]');
    if (cpBtn) {
      const item = sheets.find((x) => x.id === cpBtn.dataset.copySid);
      if (item) {
        const ok = await copyText(formatPlainSummary(item));
        toast(ok ? 'Copied calculation summary.' : 'Copy failed.');
      }
    }
  });
}

function renderChecklist(main) {
  syncNavState('checklist', '2026 Design QA Checklist');
  const state = store.get('qaChecklist', {});
  const total = ALL_REVIEW_ITEMS.length;
  const done = ALL_REVIEW_ITEMS.filter((i) => state[i.id]).length;
  const pct = total ? (done / total) * 100 : 0;

  main.innerHTML = `
    <div class="section-head">
      <div>
        <h2>2026 Electrical Design QA Checklist</h2>
        <p>Pre-submission quality review list. Progress saves automatically offline.</p>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-sm btn-outline" onclick="window.print()">Print QA Sheet</button>
        <button type="button" class="btn btn-sm btn-outline" id="reset-qa">Reset All</button>
      </div>
    </div>

    <section class="progress-card">
      <div class="meter-head">
        <span>Overall Review Completion</span>
        <span class="mono" id="qa-pct-label">${done} / ${total} (${fmt(pct, 0)}%)</span>
      </div>
      <div class="meter-track"><div class="meter-fill ok" id="qa-bar" style="width:${pct}%"></div></div>
    </section>

    ${REVIEW_GROUPS.map(([group, items], gi) => `
      <section class="checklist-group">
        <h3>${esc(group)}</h3>
        ${items.map((text, ii) => {
          const id = `qa-${gi}-${ii}`;
          return `<div class="check-item">
            <input type="checkbox" id="${id}" data-qa-id="${id}"${state[id] ? ' checked' : ''}>
            <label for="${id}">${esc(text)}</label>
          </div>`;
        }).join('')}
      </section>`).join('')}`;

  main.addEventListener('change', (e) => {
    const qid = e.target.dataset.qaId;
    if (!qid) return;
    const cur = store.get('qaChecklist', {});
    cur[qid] = e.target.checked;
    store.set('qaChecklist', cur);
    const d = ALL_REVIEW_ITEMS.filter((i) => cur[i.id]).length;
    const p = (d / total) * 100;
    const lbl = $('#qa-pct-label', main);
    const bar = $('#qa-bar', main);
    if (lbl) lbl.textContent = `${d} / ${total} (${fmt(p, 0)}%)`;
    if (bar) bar.style.width = `${p}%`;
  });

  $('#reset-qa', main).addEventListener('click', () => {
    store.set('qaChecklist', {});
    renderChecklist(main);
    toast('QA checklist reset.');
  });
}

/* Global Click Delegation for Save & Copy Buttons inside Result Panels */
document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[data-copy-key]');
  if (copyBtn) {
    const entry = lastRes[copyBtn.dataset.copyKey];
    if (!entry) return;
    const ok = await copyText(formatPlainSummary(entry));
    toast(ok ? 'Calculation summary copied to clipboard.' : 'Could not copy automatically.');
    return;
  }

  const saveBtn = e.target.closest('[data-save-key]');
  if (saveBtn) {
    const entry = lastRes[saveBtn.dataset.saveKey];
    if (!entry) return;
    openModal(
      'Save Calculation to Project',
      `<form id="save-sheet-form">
        <div class="field" style="margin-bottom:16px">
          <label for="sheet-label">Project / Circuit Label</label>
          <input id="sheet-label" type="text" required placeholder="e.g., Bldg A — Feeder MDP to LP-2F" value="${esc(entry.mod)}">
          <small class="help">Stored locally in your browser for offline review and printing.</small>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Sheet</button>
          <button type="button" class="btn btn-outline" id="cancel-save">Cancel</button>
        </div>
      </form>`,
      (body, close) => {
        $('#cancel-save', body).addEventListener('click', close);
        $('#save-sheet-form', body).addEventListener('submit', (ev) => {
          ev.preventDefault();
          const label = $('#sheet-label', body).value.trim() || entry.mod;
          const sheets = getSavedSheets();
          sheets.unshift({
            id: uid(),
            at: Date.now(),
            label,
            mod: entry.mod,
            calc: entry.calc,
            mid: entry.mid,
            inputs: entry.inputs,
            res: entry.res
          });
          setSavedSheets(sheets);
          close();
          toast(`Saved "${label}" to Project Sheets.`);
        });
      }
    );
  }
});

/* Hash Router */
function route() {
  const main = $('#main-content');
  const hash = (location.hash || '#/home').replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  const view = parts[0] || 'home';

  if (view === 'calculators') renderCalculators(main);
  else if (view === 'module' && parts[1]) renderModule(main, parts[1]);
  else if (view === 'standards') renderStandards(main);
  else if (view === 'saved') renderSaved(main);
  else if (view === 'checklist') renderChecklist(main);
  else renderHome(main);

  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------- 7. Global Search ---------- */
function buildSearchIndex() {
  const items = [];
  for (const m of MODULES) {
    items.push({
      title: `Module ${m.num}: ${m.title}`,
      sub: m.short,
      href: `#/module/${m.id}`,
      text: `${m.title} ${m.short} ${m.tags.join(' ')} ${m.cat}`.toLowerCase()
    });
    for (const f of m.formulas) {
      items.push({
        title: `Formula: ${f.n}`,
        sub: `${f.e} — ${m.title}`,
        href: `#/module/${m.id}`,
        text: `${f.n} ${f.e} ${f.t} ${m.title}`.toLowerCase()
      });
    }
  }
  items.push({ title: '2026 Electrical Design Standards', sub: 'Core voltage drop, fill, LPD, EV & PV benchmarks', href: '#/standards', text: '2026 standards ev pv spd voltage drop lpd power factor' });
  items.push({ title: '2026 Design QA Checklist', sub: 'Pre-submission engineering review checklist', href: '#/checklist', text: 'checklist qa review submission audit' });
  items.push({ title: 'Saved Project Sheets', sub: 'View offline saved calculations and print reports', href: '#/saved', text: 'saved sheets export print project' });
  return items;
}

function initSearch() {
  const input = $('#global-search');
  const clearBtn = $('#search-clear');
  const pop = $('#search-results');
  const index = buildSearchIndex();

  const close = () => {
    pop.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };

  const update = () => {
    const q = input.value.trim().toLowerCase();
    clearBtn.hidden = !q;
    if (!q) { close(); return; }
    const terms = q.split(/\s+/);
    const hits = index.filter((item) => terms.every((t) => item.text.includes(t))).slice(0, 8);
    pop.innerHTML = hits.length
      ? hits.map((h) => `<a class="search-hit" role="option" href="${esc(h.href)}"><strong>${esc(h.title)}</strong><span>${esc(h.sub)}</span></a>`).join('')
      : `<div class="search-empty">No matches for "${esc(input.value)}". Try "lumen", "conduit", "voltage drop", "EGC", or "CT".</div>`;
    pop.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', update);
  input.addEventListener('focus', update);
  clearBtn.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
  pop.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.topbar-search')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); closeModal(); }
  });
}

/* ---------- 8. PWA Features: Theme, Network Status, Install Prompt & Service Worker ---------- */
function initTheme() {
  const modes = ['system', 'light', 'dark'];
  let mode = store.get('theme', 'system');
  const btn = $('#theme-toggle');

  const apply = () => {
    document.documentElement.setAttribute('data-theme', mode);
    store.set('theme', mode);
    const label = mode === 'system' ? 'Theme: System' : (mode === 'dark' ? 'Theme: Dark' : 'Theme: Light');
    if (btn) {
      btn.title = label;
      btn.setAttribute('aria-label', `${label} — click to switch`);
    }
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0B1519' : '#0F6B6B');
  };

  apply();
  if (btn) {
    btn.addEventListener('click', () => {
      mode = modes[(modes.indexOf(mode) + 1) % modes.length];
      apply();
      toast(`Theme switched to ${mode}.`);
    });
  }
}

function initNetworkStatus() {
  const top = $('#net-status-top');
  const side = $('#net-status-side');
  const sync = () => {
    const online = navigator.onLine;
    [top, side].forEach((el) => {
      if (!el) return;
      el.classList.toggle('offline', !online);
      const span = el.querySelector('.status-label') || el.querySelector('span:last-child');
      if (span) span.textContent = online ? (el === side ? 'Offline Ready' : 'Online') : 'Offline Mode';
    });
  };
  window.addEventListener('online', () => { sync(); toast('Back online.'); });
  window.addEventListener('offline', () => { sync(); toast('Offline mode active — all 9 calculators remain available.'); });
  sync();
}

function initPWAInstallAndSW() {
  let deferredPrompt = null;
  const triggers = $$('.install-trigger');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const showTriggers = () => triggers.forEach((b) => { b.hidden = false; });
  const hideTriggers = () => triggers.forEach((b) => { b.hidden = true; });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) showTriggers();
  });

  if (isIOS && !isStandalone) showTriggers();

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideTriggers();
    toast('2026 Electrical Design Guide installed!');
  });

  triggers.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') hideTriggers();
        deferredPrompt = null;
      } else if (isIOS) {
        openModal(
          'Install on iPhone / iPad',
          `<ol style="padding-left:20px;margin:0 0 16px;color:var(--ink-2)">
            <li style="margin-bottom:8px">Tap the <strong>Share</strong> icon in Safari's toolbar.</li>
            <li style="margin-bottom:8px">Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> to install <strong>2026 ElecDesign</strong> for full-screen offline use.</li>
          </ol>
          <button type="button" class="btn btn-primary" id="ios-close">Done</button>`,
          (body, close) => $('#ios-close', body).addEventListener('click', close)
        );
      }
    });
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        const promptUpdate = (worker) => {
          toast('A new version of 2026 Electrical Design Guide is ready.', {
            sticky: true,
            action: {
              label: 'Reload',
              onClick: () => worker.postMessage({ type: 'SKIP_WAITING' })
            }
          });
        };
        if (reg.waiting) promptUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(nw);
            }
          });
        });
      }).catch((err) => console.warn('[SW] Registration skipped:', err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    });
  }
}

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#modal-close')?.addEventListener('click', closeModal);
  $('#modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });

  initTheme();
  initNetworkStatus();
  initSearch();
  initPWAInstallAndSW();
  updateSavedBadges();
  window.addEventListener('hashchange', route);
  route();
});
