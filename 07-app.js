
/* ---------- 6. Views, checklist, saved sheets, router ---------- */
const REVIEW = [
  ['Design basis & documentation', [
    'Code edition, local amendments and authority having jurisdiction (AHJ) requirements confirmed and recorded.',
    'Load schedule complete with demand factors, continuous loads and spare/future capacity documented.',
    'Single-line diagram, panel schedules and riser diagram updated and consistent with calculations.',
    'Design calculations saved (project labels) and reviewed by a second engineer.'
  ]],
  ['Lighting', [
    'Maintained lux targets met per space type with realistic maintenance factor and CU.',
    'Lighting power density within the applicable energy-code limit; controls (occupancy, daylight, dimming) specified.',
    'Emergency / egress lighting provided on a separate, tested circuit.'
  ]],
  ['Conductors, raceways & protection', [
    'Conductor ampacity verified with temperature, bundling and 125 % continuous-load factors.',
    'Voltage drop within 3 % branch / 5 % total for the worst-case circuits.',
    'Conduit fill within 53 / 31 / 40 % limits; pull points and bends checked on long runs.',
    'OCPD ratings snapped to standard sizes and matched to conductor ampacity.',
    'Available fault current calculated; AIC ratings and series ratings verified.',
    'Coordination (selectivity) study done; arc-flash labels / energy reduction measures considered.',
    'EGC and GEC sized (including upsizing for voltage drop); bonding and earth-resistance target defined.',
    'Neutral sized for expected harmonic current (non-linear loads).'
  ]],
  ['Power systems & equipment', [
    'Transformer loading ≤ 80 % at design with growth allowance; losses / efficiency level specified.',
    'Generator sized for the worst motor-starting step; transfer switch and fuel autonomy defined.',
    'MDP busbar, main breaker and enclosure ratings match demand and fault current.',
    'Three-phase loads balanced to ≤ 10 % unbalance; neutral current estimated.',
    'Power factor correction (≥ 0.90–0.95) provided with detuning where harmonics exist.'
  ]],
  ['Metering & monitoring', [
    'CT ratio, accuracy class (0.2S / 0.5 / 1.0) and burden verified; 1 A vs 5 A secondary chosen.',
    'Shorting test blocks, polarity marks and single-point CT secondary grounding specified.',
    'Sub-metering and communications pathway (e.g., Modbus / BACnet / MQTT-ready) provided for energy monitoring.'
  ]],
  ['2026 future-readiness', [
    'EV charging provisions (capacity, raceway, load management) included.',
    'PV / battery storage interconnection provisions and labelling reserved.',
    'Surge protection devices (Type 1/2/3) coordinated across service and sub-panels.',
    'Spare ways (≥ 20 %), spare raceway (≥ 25 %) and room for added equipment provided.'
  ]]
];
const reviewItems = REVIEW.flatMap((g, gi) => g[1].map((t, i) => ({ id: `r${gi}-${i}`, text: t, group: g[0] })));

function checklistHTML(storeKey, groups) {
  const state = store.get(storeKey, {});
  return groups.map(([h, items]) => `<div class="checklist-group">${h ? `<h3>${esc(h)}</h3>` : ''}${items.map(({ id, text }) => `<div class="check-item"><input type="checkbox" id="ck-${storeKey}-${id}" data-store="${storeKey}" data-id="${id}"${state[id] ? ' checked' : ''}><label for="ck-${storeKey}-${id}">${esc(text)}</label></div>`).join('')}</div>`).join('');
}
document.addEventListener('change', (e) => {
  const c = e.target;
