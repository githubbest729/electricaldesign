
/* ---------- 4. Calculator UI ---------- */
const lastRes = {};   // key -> { mod, calc, inputs, res }

function fieldHTML(f, key) {
  const id = `${key.replace('.', '-')}-${f.id}`;
  let ctl;
  if (f.type === 'select') {
    ctl = `<select id="${id}" name="${f.id}">${f.options.map((o) => `<option value="${esc(o[0])}"${String(o[0]) === String(f.value) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  } else {
    ctl = `<input id="${id}" name="${f.id}" type="number" inputmode="decimal" step="${f.step ?? 'any'}" value="${esc(f.value ?? '')}" aria-describedby="${id}-err">`;
  }
  return `<div class="field" data-field="${f.id}"><label for="${id}">${esc(f.label)}${f.unit ? ` <span class="unit">(${esc(f.unit)})</span>` : ''}</label>${ctl}${f.help ? `<small class="help">${esc(f.help)}</small>` : ''}<small class="field-error" id="${id}-err" role="alert"></small></div>`;
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
  let bad = 0, first = null;
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
    if (!Number.isFinite(x)) msg = 'Enter a number.';
    else if (f.gt != null && !(x > f.gt)) msg = `Must be greater than ${f.gt}.`;
    else if (f.min != null && x < f.min) msg = `Must be at least ${f.min}.`;
    else if (f.max != null && x > f.max) msg = `Must be ${f.max} or less.`;
    else if (f.step === 1 && !Number.isInteger(x)) msg = 'Enter a whole number.';
    if (msg) { bad++; err.textContent = msg; el.setAttribute('aria-invalid', 'true'); if (!first) first = el; }
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
  return `<span class="badge ${s}">${s === 'ok' ? 'PASS' : s === 'warn' ? 'CHECK' : 'FAIL'}</span>`;
}

function renderResult(box, key, mod, calc, inputs, res) {
  box.dataset.key = key;
  if (res.error) {
    delete lastRes[key];
    box.innerHTML = `<div class="res-error" role="alert">${esc(res.error)}${res.hint ? `<small>${esc(res.hint)}</small>` : ''}</div>`;
    return;
  }
  lastRes[key] = { mod: mod.title, calc: calc.title, mid: mod.id, inputs, res };
  const rowsHtml = res.rows.map((r) => `<div class="res-row${r.big ? ' big' : ''}"><dt>${esc(r.k)}</dt><dd><span>${esc(r.v)}</span>${r.u ? `<span class="u">${esc(r.u)}</span>` : ''}${statusBadge(r.s)}</dd></div>`).join('');
  const barsHtml = (res.bars || []).map((b) => {
    const scale = b.scale || 100;
