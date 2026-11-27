
/* ---------- 3. Modules (content + calculators) ---------- */
const MODULES = [];
const S = (v) => (v === 'yes'); // select helper
const row = (k, v, u, s, big) => ({ k, v, u: u || '', s: s || '', big: !!big });
const spaceOptions = SPACES.map((s, i) => [String(i), `${s[0]} — ${s[1]} (${s[2]} lx)`]);

/* ===== 1. Illumination ===== */
MODULES.push({
  id: 'illumination', num: 1, title: 'Illumination Computation',
  short: 'Lumen Method for 2026 LED lighting: fixture count, spacing, achieved lux and LPD check.',
  tags: ['Lumen Method', 'Lux table', 'LPD'],
  guide: [
    { h: '2026 lighting design essentials', items: [
      'Design to the <strong>maintained illuminance</strong> (lux) on the working plane. Use LED luminaires with L80/L90 ≥ 50,000 h and apply a realistic maintenance factor (MF).',
      'Typical LED MF is 0.80–0.90 for clean interiors (lumen depreciation × dirt × driver factor). Use 0.70–0.75 for dusty industrial spaces.',
      'Check the <strong>Lighting Power Density (LPD, W/m²)</strong> against your energy code (e.g., ASHRAE 90.1 / local green-building rules). Modern LED designs commonly land at 4–9 W/m² for offices and commercial areas.',
      'Prefer luminaires with ≥ 110 lm/W system efficacy, dimming (0–10 V / DALI-2), occupancy and daylight-harvesting controls.',
      'Keep spacing-to-mounting-height ratio (SHR) within the manufacturer\'s limit (commonly 1.0–1.5 for downlights) to maintain uniformity ≥ 0.6 (Emin/Eavg).',
      'Provide emergency/egress lighting (≥ 1 lx on the escape route, 90 minutes) on a separate, tested circuit.'
    ] },
    { h: 'Design steps', items: [
      'Select the space type and target maintained lux (table below, or project criteria).',
      'Determine the room index <code>RI = (L × W) / (Hm × (L + W))</code> where Hm = luminaire height above the working plane.',
      'Read the Coefficient of Utilization (CU) from the manufacturer\'s table using RI and surface reflectances (ceiling/walls/floor ≈ 70/50/20 %).',
      'Compute the fixture count, round up, then arrange symmetrically in rows × columns.',
      'Verify spacing (SHR), achieved lux and LPD; adjust lumens or count and repeat.'
    ] }
  ],
  formulas: [
    { n: 'Number of luminaires', e: 'N = (E × A) / (Φ × CU × MF)', t: 'E = target lux, A = floor area (m²), Φ = lumens per luminaire' },
    { n: 'Room index', e: 'RI = (L × W) / (Hm × (L + W))', t: 'Hm = mounting height above the working plane' },
    { n: 'Achieved illuminance', e: 'E = (N × Φ × CU × MF) / A', t: 'Re-check after rounding N up' },
    { n: 'Lighting power density', e: 'LPD = (N × P) / A  [W/m²]', t: 'P = input watts per luminaire including driver' },
    { n: 'Spacing-to-height ratio', e: 'SHR = S / Hm', t: 'S = center-to-center spacing; stay at or below the luminaire\'s maximum SHR' }
  ],
  tables: [
    { title: 'Reference maintained illuminance and typical LED LPD targets', head: ['Category', 'Space', 'Target lux', 'LPD target (W/m²)'], num: [2, 3],
      rows: SPACES.map((s) => [s[0], s[1], s[2], s[3]]),
      note: 'Illuminance follows common IES / EN 12464-1 practice. LPD values are typical LED design targets; always confirm against the energy code and PEC/IES criteria your project is bound to.' },
    { title: 'Typical maintenance factors (LED)', head: ['Environment', 'MF'], num: [1], rows: [['Clean (offices, hotels, retail)', '0.85–0.90'], ['Normal (corridors, schools, hospitals)', '0.80–0.85'], ['Dirty (workshops, kitchens)', '0.70–0.75'], ['Very dirty / outdoor', '0.60–0.70']] }
  ],
