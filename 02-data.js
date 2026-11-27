
/* ---------- 2. Engineering data & helper functions ---------- */
/* Conductor data: ampacity [60°C, 75°C, 90°C] for copper/aluminum (NEC 310.16-style, not more than three
 * current-carrying conductors, 30 °C ambient), THHN/THWN-2 finished areas in in², nearest standard metric mm². */
const COND = [
  ['14', 2.08, 4.11, [15, 20, 25], null, 0.0097, 2.5],
  ['12', 3.31, 6.53, [20, 25, 30], [15, 20, 25], 0.0133, 4],
  ['10', 5.26, 10.38, [30, 35, 40], [25, 30, 35], 0.0211, 6],
  ['8', 8.37, 16.51, [40, 50, 55], [30, 40, 45], 0.0366, 10],
  ['6', 13.3, 26.24, [55, 65, 75], [40, 50, 55], 0.0507, 16],
  ['4', 21.2, 41.74, [70, 85, 95], [55, 65, 75], 0.0824, 25],
  ['3', 26.7, 52.62, [85, 100, 115], [65, 75, 85], 0.0973, 35],
  ['2', 33.6, 66.36, [95, 115, 130], [75, 90, 100], 0.1158, 35],
  ['1', 42.4, 83.69, [110, 130, 145], [85, 100, 115], 0.1562, 50],
  ['1/0', 53.5, 105.6, [125, 150, 170], [100, 120, 135], 0.1855, 70],
  ['2/0', 67.4, 133.1, [145, 175, 195], [115, 135, 150], 0.2223, 70],
  ['3/0', 85.0, 167.8, [165, 200, 225], [130, 155, 175], 0.2679, 95],
  ['4/0', 107.2, 211.6, [195, 230, 260], [150, 180, 205], 0.3237, 120],
  ['250', 127, 250, [215, 255, 290], [170, 205, 230], 0.397, 150],
  ['300', 152, 300, [240, 285, 320], [195, 230, 260], 0.4608, 185],
  ['350', 177, 350, [260, 310, 350], [210, 250, 280], 0.5242, 185],
  ['400', 203, 400, [280, 335, 380], [225, 270, 305], 0.5863, 240],
  ['500', 253, 500, [320, 380, 430], [260, 310, 350], 0.7073, 300],
  ['600', 304, 600, [350, 420, 475], [285, 340, 385], 0.8676, 400],
  ['750', 380, 750, [400, 475, 535], [320, 385, 435], 1.0496, 400],
  ['1000', 507, 1000, [455, 545, 615], [375, 445, 500], 1.3478, 630]
].map(([s, mm2, kc, cu, al, a, met]) => ({
  s, mm2, kc, cu, al, a, met,
  lab: ['250', '300', '350', '400', '500', '600', '750', '1000'].includes(s) ? `${s} kcmil` : `${s} AWG`
}));
const CONDMAP = Object.fromEntries(COND.map((c) => [c.s, c]));
const condOptions = (from = 0) => COND.slice(from).map((c) => [c.s, `${c.lab} (${c.mm2} mm²)`]);
const IN2_TO_MM2 = 645.16;

const RHO = { cu: 0.02097, al: 0.03452 };   // Ω·mm²/m at 75 °C conductor temperature
const XPM = 0.00017;                        // Ω/m typical reactance for conductors in conduit

const TEMP_ROWS = [
  [25, [1.08, 1.05, 1.04]], [30, [1, 1, 1]], [35, [0.91, 0.94, 0.96]], [40, [0.82, 0.88, 0.91]],
  [45, [0.71, 0.82, 0.87]], [50, [0.58, 0.75, 0.82]], [55, [0.41, 0.67, 0.76]], [60, [0, 0.58, 0.71]],
  [65, [0, 0.47, 0.65]], [70, [0, 0.33, 0.58]], [75, [0, 0, 0.5]], [80, [0, 0, 0.41]]
];
function tempFactor(ambient, rating) {
  const col = rating === 60 ? 0 : rating === 75 ? 1 : 2;
  for (const [mx, f] of TEMP_ROWS) if (ambient <= mx) return f[col];
  return 0;
}
function bundleFactor(n) {
  if (n <= 3) return 1;
  if (n <= 6) return 0.8;
  if (n <= 9) return 0.7;
  if (n <= 20) return 0.5;
  if (n <= 30) return 0.45;
  if (n <= 40) return 0.4;
  return 0.35;
}
const ratingCol = (r) => (r === 60 ? 0 : r === 75 ? 1 : 2);

/* Voltage drop in volts for a run of one-way length L (m). */
function voltDrop({ phases, I, L, size, mat, pf }) {
  const c = CONDMAP[size];
  const r = RHO[mat] / c.mm2;
  const sin = Math.sqrt(Math.max(0, 1 - pf * pf));
  const k = phases === 1 ? 2 : SQRT3;
  return k * I * L * (r * pf + XPM * sin);
}
