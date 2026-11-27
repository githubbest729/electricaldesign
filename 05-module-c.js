
/* ===== 6. Load balancing ===== */
MODULES.push({
  id: 'balance', num: 6, title: 'Load Balancing in 3-Phase Systems',
  short: 'Phase totals, % unbalance, neutral current and automatic rebalancing suggestions for panelboards.',
  tags: ['Unbalance ≤ 10 %', 'Neutral current', 'Rebalance'],
  guide: [
    { h: 'Why balance?', items: [
      'Unbalanced loading raises neutral current, causes uneven voltage drop, overheats conductors and transformers and wastes capacity.',
      'Target a <strong>maximum phase unbalance of ≤ 10 %</strong> at panelboards and ≤ 5 % at transformers and generators where possible (generators may be limited to 10 % per phase by the manufacturer).',
      'Distribute single-phase circuits in repeating A-B-C order down the panel; keep large single-phase loads (e.g., 230 V two-pole) spread across different phase pairs.',
      'Balance by <strong>demand</strong>, not just connected load — a 1 kVA continuous load counts more than a 1 kVA intermittent load.',
      'Re-check balance after additions, tenant changes and when EV chargers or heat pumps are added (2026 loads are often large single-phase).',
      'With non-linear loads (LED drivers, IT), triplen harmonics add in the neutral — size the neutral for 100–200 % of phase current if harmonics are significant.'
    ] },
    { h: 'Design steps', items: [
      'List each single-phase circuit with its load (VA or A) and its phase assignment.',
      'Sum phase loads, compute the average and the maximum deviation from the average.',
      'If unbalance > 10 %, move circuits from the heaviest phase to the lightest and recalculate.',
      'Estimate neutral current for the final arrangement and check the neutral conductor and any harmonics.',
      'Record the final circuit-to-phase schedule on the panel schedule.'
    ] }
  ],
  formulas: [
    { n: 'Phase current', e: 'I_phase = VA_phase / V_LN', t: 'V_LN = line-to-neutral voltage (e.g., 230 V in a 400 V system)' },
    { n: 'Percent unbalance', e: '% = (max deviation from average) / average × 100', t: 'Average = (A + B + C) / 3' },
    { n: 'Neutral current (linear loads)', e: 'I_N = √(Ia² + Ib² + Ic² − Ia·Ib − Ib·Ic − Ic·Ia)', t: 'Assumes similar power factors; add harmonic current if non-linear' },
    { n: '3-phase balanced capacity', e: 'kVA = √3 × V_LL × I / 1000', t: 'Use the highest phase current as the design basis' }
  ],
  tables: [
    { title: 'Unbalance guidance', head: ['Unbalance', 'Assessment', 'Action'], rows: [['≤ 5 %', 'Excellent', 'No action'], ['5–10 %', 'Acceptable', 'Review at next modification'], ['> 10 %', 'Unbalanced', 'Move circuits between phases'], ['> 20 %', 'Severe', 'Rebalance urgently; check neutral and transformer loading']] }
  ],
  calcs: [{ id: 'balancer', title: 'Panelboard load balancer', custom: 'balancer' }]
});

/* ===== 7. Equipment sizing ===== */
MODULES.push({
  id: 'equipment', num: 7, title: 'Electrical Equipment Sizing',
  short: 'Distribution transformers, standby generators, MDP/busbars and disconnect switches.',
  tags: ['Transformer kVA', 'Generator', 'MDP', 'Disconnect'],
  guide: [
    { h: 'Sizing guidelines', items: [
      '<strong>Transformers:</strong> size on demand kVA with 20–30 % growth; target 60–80 % loading at design to extend life and improve efficiency. Prefer low-loss (e.g., DOE-2016 / Tier-2-class) units.',
