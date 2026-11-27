

/* ===== 3. Conduit sizing ===== */
const CFG = {
  '1p2w': { name: '1-phase, 2-wire (1 line + neutral)', hot: 1, neu: 1 },
  '1p3w': { name: '1-phase, 3-wire (2 lines + neutral)', hot: 2, neu: 1 },
  '3p3w': { name: '3-phase, 3-wire (3 lines)', hot: 3, neu: 0 },
  '3p4w': { name: '3-phase, 4-wire (3 lines + neutral)', hot: 3, neu: 1 }
};
const tradeLabel = (i) => `${TRADE[i][0]} in (${TRADE[i][1]} mm)`;
MODULES.push({
  id: 'conduit', num: 3, title: 'Conduit Sizing (1-Phase & 3-Phase)',
  short: 'Conduit fill for THHN/THWN-2 conductors in PVC Sch 40/80, EMT, IMC and RSC with exact fill percentage.',
  tags: ['Fill 53/31/40 %', 'THHN', 'Trade size'],
  guide: [
    { h: 'Conduit fill rules', items: [
      'Maximum fill of the conduit internal area: <strong>53 %</strong> for one conductor, <strong>31 %</strong> for two conductors, <strong>40 %</strong> for three or more conductors (NEC Chapter 9, Table 1).',
      'Count every conductor including neutrals and equipment grounding conductors when calculating fill.',
      'Use the <strong>actual finished conductor area</strong> (Chapter 9, Table 5). THHN and THWN-2 share the same dimensions.',
      'Short nipples (≤ 24 in / 600 mm) may be filled to 60 %; conductors in them are not derated for bundling in many cases — check the code.',
      'Bends: no more than 360° (four quarter bends) between pull points; add pull boxes on long runs and size them per the code.',
      'Allow for 2026 growth: where cost is small, choose one trade size larger or add a spare conduit — upgrades are expensive after the slab is poured.'
    ] },
    { h: 'Design steps', items: [
      'Determine conductors per circuit from the wiring configuration (1-phase 2-/3-wire, 3-phase 3-/4-wire).',
      'Add the EGC and the number of circuits sharing the raceway.',
      'Sum the finished areas and divide by the allowed fill percentage to get the minimum conduit area.',
      'Pick the smallest trade size of the chosen conduit type whose internal area meets the requirement.',
      'Check ampacity derating if more than three current-carrying conductors share the raceway.'
    ] }
  ],
  formulas: [
    { n: 'Total conductor area', e: 'A_total = Σ (n_i × a_i)', t: 'a = finished area of each conductor size (mm² or in²)' },
    { n: 'Minimum conduit area', e: 'A_conduit ≥ A_total / fill_limit', t: 'fill limit 0.53 / 0.31 / 0.40' },
    { n: 'Percent fill', e: 'Fill % = A_total / A_conduit(100 %) × 100', t: 'Compare against the allowed limit' }
  ],
  tables: [
    { title: 'THHN / THWN-2 finished conductor area', head: ['Size', 'Area (mm²)', 'Area (in²)'], num: [1, 2],
      rows: COND.map((c) => [c.lab, fmt(c.a * IN2_TO_MM2, 1), c.a.toFixed(4)]) },
    { title: 'Conduit internal area at 100 % (in²)', head: ['Trade size', 'Metric', 'PVC Sch 40', 'PVC Sch 80', 'EMT', 'IMC', 'RSC'], num: [2, 3, 4, 5, 6],
      rows: TRADE.map((t, i) => [t[0] + ' in', t[1] + ' mm', CONDUIT.pvc40.a[i], CONDUIT.pvc80.a[i], CONDUIT.emt.a[i], CONDUIT.imc.a[i], CONDUIT.rsc.a[i]]),
      note: 'Values follow NEC Chapter 9, Table 4 style data. Confirm against the edition and manufacturer data used for the project.' }
  ],
  calcs: [{
    id: 'fill', title: 'Conduit fill calculator',
    intro: 'Selects the smallest conduit that satisfies the 53 / 31 / 40 % fill rule for 1-phase or 3-phase conductor groups.',
    fields: [
      { id: 'cfg', label: 'Wiring configuration', type: 'select', value: '3p4w', options: Object.entries(CFG).map(([k, c]) => [k, c.name]) },
