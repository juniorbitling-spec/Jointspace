// ═════════════════════════════════════════════════════════════════
// SECTION BUILDER — common skeleton + region-specific content
// Field: {k,l,t:'text'|'num'|'date'|'sel'|'ta'|'chip'|'multi',o,ph,full,u}
// Blocks: {h} {note} {f:[fields]} {tbl} {tests} {q:id} {cl:[checklists]} {calc} {nprs} {img}
// ═════════════════════════════════════════════════════════════════
const SEC_CACHE = {};
function buildSections(rid) {
  if (SEC_CACHE[rid]) return SEC_CACHE[rid];
  const R = REGIONS[rid];
  const secs = [
  { id:'pt', t:'Patient Details', b:[
    {f:[
      {k:'pt.name',l:'Patient name *',ph:'Full name'},{k:'pt.case',l:'Case / OP no.',ph:'Case #'},{k:'pt.date',l:'Assessment date',t:'date'},
      {k:'pt.age',l:'Age',t:'num',u:'yrs'},{k:'pt.sex',l:'Sex',t:'sel',o:['Male','Female','Other']},{k:'pt.ht',l:'Height',t:'num',u:'cm'},{k:'pt.wt',l:'Weight',t:'num',u:'kg'},
      {k:'pt.phone',l:'Contact',ph:'Phone'},{k:'pt.occ',l:'Occupation',ph:'Job / role'},{k:'pt.ref',l:'Referred by',ph:'Doctor / Self'},{k:'pt.refdx',l:'Referral diagnosis'},{k:'pt.therapist',l:'Physiotherapist'},
      {k:'pt.side',l:'Affected side',t:'chip',o:['Left','Right','Bilateral','Central']},{k:'pt.hand',l:'Dominance',t:'chip',o:['Right','Left','Ambidextrous']},
      {k:'pt.work',l:'Work / activity demands',t:'multi',o:['Prolonged sitting','Prolonged standing','Heavy manual / lifting','Overhead work','Keyboard / fine motor','Driving','Sport','Not working'],full:1},
      {k:'pt.addr',l:'Address',t:'ta',full:1},
    ]},
    {calc:'bmi'},
  ]},
  { id:'hx', t:'Chief Complaint & History', b:[
    {f:[
      {k:'hx.cc',l:'Chief complaint (patient\'s words)',t:'ta',full:1},
      {k:'hx.onset',l:'Onset',t:'chip',o:['Sudden','Gradual','Insidious','After trauma / fall','Overuse / repetitive','Sports injury','Post-surgery','Post-immobilisation'],full:1},
      {k:'hx.dur',l:'Duration',ph:'e.g. 6 weeks'},{k:'hx.stage',l:'Stage',t:'chip',o:['Acute (<6 wk)','Subacute (6–12 wk)','Chronic (>12 wk)','Acute-on-chronic']},
      {k:'hx.episode',l:'Episode',t:'chip',o:['First episode','Recurrent']},{k:'hx.prev',l:'No. of previous episodes',t:'num'},{k:'hx.course',l:'Progression',t:'chip',o:['Improving','Static','Worsening','Fluctuating']},
      ...(R.hx||[]),
      {k:'hx.mech',l:'Mechanism of injury (details)',t:'ta',full:1},{k:'hx.hopi',l:'History of present illness',t:'ta',full:1},
      {k:'hx.surgery',l:'Surgery on this region (type, date)',full:1},{k:'hx.rx',l:'Treatment so far & response',t:'ta',full:1,ph:'Medication, injections, physiotherapy, brace, rest…'},
    ]},
  ]},
  { id:'pain', t:'Pain Profile & Behaviour', b:[
    {h:'Area & nature (body chart)'},
    {f:[
      {k:'pain.area',l:'Symptom areas',t:'multi',o:R.areas,full:1},...(R.painExtra||[]),
      {k:'pain.type',l:'Quality',t:'multi',o:['Dull ache','Sharp','Stabbing','Burning','Shooting / electric','Tingling / pins & needles','Numbness','Throbbing','Stiffness','Cramping','Heaviness / weakness','Clicking / catching'],full:1},
      {k:'pain.pattern',l:'Pattern',t:'chip',o:['Constant','Intermittent','Constant with variation']},
      {k:'pain.body',l:'Body chart notes',t:'ta',full:1,ph:'P1, P2… relationship between areas, paraesthesia distribution'},
    ]},
    {h:'Pain intensity — NPRS (0–10)'},
    {nprs:[['nprs.now','Current'],['nprs.best','Best (24 h)'],['nprs.worst','Worst (24 h)'],['nprs.act','On activity'],...(R.nprs||[])]},
    {h:'24-hour behaviour'},
    {f:[
      {k:'pain.am',l:'Morning stiffness',t:'chip',o:['None','< 30 min','30–60 min','> 60 min']},
      {k:'pain.night',l:'Night pain',t:'chip',o:['None','On movement / lying on it','Wakes from sleep','Constant / unrelenting']},
      {k:'pain.eve',l:'Through day',t:'chip',o:['Better as day goes','Worse as day goes','No change']},
    ]},
    {h:'Aggravating & easing factors'},
    {f:[
      {k:'pain.agg',l:'Aggravating',t:'multi',o:R.agg,full:1},{k:'pain.aggn',l:'Aggravating details (time to onset, severity)',t:'ta',full:1},
      {k:'pain.ease',l:'Easing',t:'multi',o:['Rest','Movement / exercise','Changing position','Heat','Ice','Medication',...(R.ease||[])],full:1},{k:'pain.easen',l:'Easing details',t:'ta',full:1},
      {k:'pain.sev',l:'Severity',t:'chip',o:['Low','Moderate','High']},{k:'pain.irr',l:'Irritability',t:'chip',o:['Low','Moderate','High']},
      {k:'pain.nature',l:'Nature',t:'chip',o:['Mechanical','Inflammatory','Neuropathic','Non-mechanical']},
      ...(R.tol?[{k:'pain.sit',l:'Sitting tolerance',u:'min',t:'num'},{k:'pain.stand',l:'Standing tolerance',u:'min',t:'num'},{k:'pain.walk',l:'Walking tolerance',u:'min',t:'num'}]:[]),
    ]},
  ]},
  { id:'flags', t:'Red & Yellow Flags', b:[
    {note:R.rfNote||'Red flags marked <b>⚠</b> require <b>urgent referral</b>; others warrant medical review before treatment.'},
    {tests:{k:'rf', yn:1, rows:R.rf}},{calc:'rf'},
    ...(R.cprFlags?[{h:'Clinical decision rules'},{cl:R.cprFlags}]:[]),
    {h:'Yellow flags (psychosocial)'},
    {tests:{k:'yf', yn:1, rows:YELLOW}},{calc:'yf'},
    {f:[{k:'flags.n',l:'Flag notes / action taken',t:'ta',full:1}]},
  ]},
  { id:'pmh', t:'Medical, Drug & Social History', b:[
    {f:[
      {k:'pmh.como',l:'Co-morbidities',t:'multi',o:['Diabetes','Hypertension','Cardiac disease','Thyroid disorder','Osteoporosis','Osteoarthritis','Rheumatoid arthritis','Ankylosing spondylitis','Gout','Renal disease','Asthma / COPD','Obesity','Depression / anxiety','Past cancer','Pregnancy','Post-partum','Hypermobility'],full:1},
      {k:'pmh.surg',l:'Other surgical history',t:'ta',full:1},{k:'pmh.meds',l:'Current medications',t:'ta',full:1,ph:'Analgesics, NSAIDs, steroids, anticoagulants, fluoroquinolones…'},
      {k:'pmh.allergy',l:'Allergies',ph:'None known'},{k:'pmh.fam',l:'Family history'},
      {k:'pmh.smoke',l:'Smoking',t:'chip',o:['Never','Ex-smoker','Current']},{k:'pmh.alcohol',l:'Alcohol',t:'chip',o:['None','Occasional','Regular']},
      {k:'pmh.activity',l:'Activity level',t:'chip',o:['Sedentary','Light','Moderate','Active','Athlete']},{k:'pmh.sport',l:'Sport / exercise',ph:'Type, level, frequency'},
      {k:'pmh.sleepq',l:'Sleep quality',t:'chip',o:['Good','Disturbed','Poor']},
      {k:'pmh.adl',l:'ADL / work / leisure limitations',t:'ta',full:1},{k:'pmh.goal',l:'Patient\'s goals & expectations',t:'ta',full:1},
    ]},
  ]},
  { id:'om', t:'Outcome Measures', b:R.om },
  { id:'obs', t:'Observation & Posture', b:[...R.obs, {img:'posture'}] },
  { id:'rom', t:'Range of Motion — Individual', b:[...R.rom, {f:[{k:'rom.notes',l:'ROM notes',t:'ta',full:1}]}] },
  { id:'mmt', t:'Manual Muscle Testing — Individual (MRC 0–5)', b:[...R.mmt, {f:[{k:'mmt.notes',l:'Muscle imbalance / motor control notes',t:'ta',full:1}]}] },
  R.flex && { id:'flex', t:'Muscle Length & Flexibility', b:R.flex },
  { id:'neuro', t:'Neurological Examination', b: R.neuro==='UL' ? NEURO_UL() : NEURO_LL() },
  { id:'st', t:'Special Tests', b:[
    {note:'Tap <b>POS</b> / <b>NEG</b> / <b>N/A</b> for each side. Single-column tests are midline / one-off tests. Cluster scores update automatically.'},
    {tests:{k:'st', rows:R.tests}},
    {calc:'clusters'},
    ...(R.cpr?[{h:'Clinical prediction rules (tick criteria present)'},{cl:R.cpr}]:[]),
    {f:[{k:'st.notes',l:'Special test notes',t:'ta',full:1}]},
  ]},
  { id:'palp', t:'Palpation', b:[...R.palp, {f:[{k:'palp.temp',l:'Temperature / skin',t:'chip',o:['Normal','Warm','Cold','Sweating','Trophic changes']},{k:'palp.notes',l:'Palpation notes',t:'ta',full:1}]}] },
  { id:'inv', t:'Investigations — MRI & Imaging', b:[...R.inv, {img:'other'}] },
  { id:'func', t:'Functional Assessment', b:[...R.func,
    {h:'Patient-Specific Functional Scale (0 = unable, 10 = pre-injury)'},
    {tbl:{k:'psfs', cols:[{h:'Activity'},{h:'Score 0–10',t:'num'}], rows:[['Activity 1'],['Activity 2'],['Activity 3'],['Activity 4'],['Activity 5']]}},{calc:'psfs'},
  ]},
  { id:'dx', t:'Clinical Reasoning & Diagnosis', b:[
    {f:[
      {k:'dx.primary',l:'Provisional diagnosis',t:'sel',full:1,o:R.dx},
      {k:'dx.level',l:'Structure / level',t:'multi',o:R.levels},{k:'dx.side',l:'Side',t:'chip',o:['Left','Right','Bilateral','Central']},
      {k:'dx.grade',l:'Grade / stage',ph:'e.g. Grade II, KL 3, stage 2'},{k:'dx.second',l:'Secondary diagnosis',full:1},
      {k:'dx.mech',l:'Pain mechanism',t:'multi',o:['Nociceptive — mechanical','Nociceptive — inflammatory','Peripheral neuropathic','Nociplastic / central sensitisation','Mixed'],full:1},
      {k:'dx.tbc',l:'Classification / dominant presentation',t:'chip',o:R.tbc,full:1},
      {k:'dx.ddx',l:'Differential diagnoses',t:'ta',full:1},
      {k:'dx.icf1',l:'Impairments (body structure / function)',t:'ta',full:1},{k:'dx.icf2',l:'Activity limitations',t:'ta',full:1},{k:'dx.icf3',l:'Participation restrictions',t:'ta',full:1},
      {k:'dx.contrib',l:'Contributing factors',t:'ta',full:1},
      {k:'dx.prog',l:'Prognosis',t:'chip',o:['Excellent','Good','Fair','Guarded','Poor']},
      {k:'dx.refer',l:'Referral',t:'multi',o:['None required','Orthopaedics','Sports medicine','Neurosurgery','Rheumatology','Hand surgeon','Pain clinic','Emergency','GP / physician','Radiology','Psychology','Podiatry / orthotics'],full:1},
      {k:'dx.imp',l:'Clinical impression / summary',t:'ta',full:1},
    ]},
  ]},
  { id:'goals', t:'Goals', b:[
    {h:'Short-term goals (2–4 weeks)'},{f:[1,2,3].map(i=>({k:'goal.st'+i,l:'STG '+i,full:1,ph:'SMART goal'}))},
    {h:'Long-term goals (6–12 weeks)'},{f:[1,2,3].map(i=>({k:'goal.lt'+i,l:'LTG '+i,full:1,ph:'SMART goal'}))},
  ]},
  { id:'plan', t:'Treatment Plan', b:[
    {tbl:{k:'rx', cols:[{h:'Use',t:'sel',o:['✔ Yes','Later phase','No']},{h:'Dosage / parameters'},{h:'Notes'}], rows:[
      {g:'Education & self-management'},['Reassurance & education (condition, prognosis)'],['Pain neuroscience education'],['Activity modification / load management'],['Ergonomic & postural advice'],
      ...R.rx,
    ]}},
    {f:[{k:'plan.freq',l:'Frequency',ph:'e.g. 3× / week'},{k:'plan.dur',l:'Duration',ph:'e.g. 6 weeks'},{k:'plan.sessions',l:'Sessions planned',t:'num'},{k:'plan.hep',l:'Home exercise programme',t:'ta',full:1},{k:'plan.prec',l:'Precautions / contraindications',t:'ta',full:1}]},
  ]},
  { id:'sign', t:'Clinician Sign-off', b:[
    {f:[{k:'sign.by',l:'Assessed by'},{k:'sign.qual',l:'Qualification',ph:'BPT / MPT'},{k:'sign.reg',l:'Registration no.'},{k:'sign.date',l:'Date',t:'date'},{k:'sign.next',l:'Next review',t:'date'},
      {k:'sign.consent',l:'Consent',t:'chip',o:['Verbal consent obtained','Written consent obtained']},{k:'sign.notes',l:'Additional notes',t:'ta',full:1}]},
  ]},
  ].filter(Boolean);
  return (SEC_CACHE[rid] = secs);
}

// ═════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════
const $ = s => document.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has = v => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '';
const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const today = () => new Date().toISOString().slice(0,10);
const isRow = r => Array.isArray(r);
function showToast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400); }
function eachBlock(secs, fn) { secs.forEach(s => s.b.forEach(b => fn(b, s))); }
function listRows(secs, k) { let out = []; eachBlock(secs, b => { if (b.tests?.k===k) out = b.tests.rows.filter(isRow); if (b.tbl?.k===k) out = b.tbl.rows.filter(isRow); }); return out; }
function rowIdx(secs, k, prefix) { return listRows(secs, k).findIndex(r => r[0].startsWith(prefix)); }
function stPosSides(v, secs, prefix) { const i = rowIdx(secs, 'st', prefix); return i < 0 ? [] : ['L','R','C'].filter(s => v[`st.${i}.${s}`]==='pos'); }
function stTested(v, secs, prefix) { const i = rowIdx(secs, 'st', prefix); return i >= 0 && ['L','R','C'].some(s => has(v[`st.${i}.${s}`])); }
const pct = (a, b) => b ? Math.round(a / b * 100) : null;

// ═════════════════════════════════════════════════════════════════
// FORM RENDERING
// ═════════════════════════════════════════════════════════════════
function ctl(key, c, cls='', rowOpts) {
  const t = c.t || 'text';
  if (t === 'sel') { const o = (c.rowOpts && rowOpts) || c.o; return `<select data-k="${key}" class="${cls}"><option value="">—</option>${o.map(x=>`<option>${esc(x)}</option>`).join('')}</select>`; }
  if (t === 'ta') return `<textarea data-k="${key}" class="${cls}" placeholder="${esc(c.ph||'')}"></textarea>`;
  if (t === 'chip' || t === 'multi') return `<div class="chips" data-k="${key}"${t==='multi'?' data-multi="1"':''}>${c.o.map(o=>`<span class="chip" data-v="${esc(o)}">${esc(o)}</span>`).join('')}</div>`;
  const it = t === 'num' ? 'number' : t === 'date' ? 'date' : 'text';
  return `<input type="${it}" data-k="${key}" class="${cls}" placeholder="${esc(c.ph||'')}"${it==='number'?' step="any" inputmode="decimal"':''}>`;
}
function fieldHTML(f) {
  const cls = f.t==='sel' ? 'field-select' : f.t==='ta' ? 'field-textarea' : 'field-input';
  const full = f.full || f.t==='ta' || f.t==='multi';
  return `<div class="${full?'full':''}"><label class="field-label">${esc(f.l)}${f.u?` <span class="hint">(${esc(f.u)})</span>`:''}</label>${ctl(f.k,f,cls)}</div>`;
}
function pnHTML(key, yn) {
  const opts = yn ? [['yes','YES'],['no','NO']] : [['pos','POS'],['neg','NEG'],['na','N/A']];
  return `<div class="pn" data-k="${key}">${opts.map(([v,l])=>`<button type="button" class="pn-btn" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function tableHTML(tb) {
  let ri = 0;
  const body = tb.rows.map(r => {
    if (!isRow(r)) return `<tr class="grp"><td colspan="${tb.cols.length+1}">${esc(r.g)}</td></tr>`;
    const i = ri++;
    return `<tr><td class="row-label">${esc(r[0])}${r[1]?`<span class="row-sub">${esc(r[1])}</span>`:''}</td>${tb.cols.map((c,ci)=>`<td>${ctl(`${tb.k}.${i}.${ci}`,c,'',r[2])}</td>`).join('')}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="assess-table"><thead><tr><th>Item</th>${tb.cols.map(c=>`<th>${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function testsHTML(ts) {
  let ri = 0;
  const cols = ts.yn ? 2 : 4;
  const body = ts.rows.map(r => {
    if (!isRow(r)) return `<tr class="grp"><td colspan="${cols}">${esc(r.g)}</td></tr>`;
    const i = ri++, [name, purpose, sides, how] = r;
    const lbl = `<td class="row-label">${ts.yn&&sides===1?'⚠ ':''}${esc(name)}<span class="row-sub">${esc(purpose)}</span>${how?`<span class="row-how">${esc(how)}</span>`:''}</td>`;
    if (ts.yn) return `<tr>${lbl}<td>${pnHTML(`${ts.k}.${i}`,1)}</td></tr>`;
    const cells = sides === 2 ? `<td>${pnHTML(`${ts.k}.${i}.L`)}</td><td>${pnHTML(`${ts.k}.${i}.R`)}</td>` : `<td colspan="2">${pnHTML(`${ts.k}.${i}.C`)}</td>`;
    return `<tr>${lbl}${cells}<td><input type="text" data-k="${ts.k}.${i}.f" placeholder="Findings…"></td></tr>`;
  }).join('');
  const head = ts.yn ? '<th>Item</th><th>Present?</th>' : '<th>Test &amp; purpose</th><th>Left</th><th>Right</th><th>Findings</th>';
  return `<div class="table-wrap"><table class="assess-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function qHTML(id) {
  const Q = QDEF[id];
  return `<div class="sub-head">${esc(Q.t)}</div>` + Q.items.map(([title, opts], i) => {
    const vert = !Q.row && opts.length > 2;
    return `<div class="q-item"><div class="q-title">${esc(title)}</div><div class="chips ${vert?'vert':''}" data-k="${id}.${i}">${opts.map((o,oi)=>{const lab=Array.isArray(o)?`${o[0]} (${o[1]})`:(Q.showIdx?oi+' — ':'')+o;return `<span class="chip" data-v="${oi}">${esc(lab)}</span>`;}).join('')}</div></div>`;
  }).join('') + `<div class="calc" data-calc="q:${id}"></div>`;
}
function blockHTML(b) {
  if (b.h) return `<div class="sub-head">${esc(b.h)}</div>`;
  if (b.note) return `<div class="note">${b.note}</div>`;
  if (b.f) return `<div class="fgrid">${b.f.map(fieldHTML).join('')}</div>`;
  if (b.tbl) return tableHTML(b.tbl);
  if (b.tests) return testsHTML(b.tests);
  if (b.q) return qHTML(b.q);
  if (b.cl) return b.cl.map(c => `<div class="fgrid">${fieldHTML({k:c.k,l:`${c.l} — ≥ ${c.need} of ${c.o.length}`,t:'multi',o:c.o})}</div><div class="calc" data-calc="cl:${c.k}"></div>`).join('');
  if (b.calc) return `<div class="calc" data-calc="${b.calc}"></div>`;
  if (b.nprs) return b.nprs.map(([k,l])=>`<div class="nprs-row"><label class="field-label" style="margin:0">${esc(l)}</label><input type="range" min="0" max="10" step="1" value="0" data-k="${k}" data-nprs="1"><span class="nprs-val" data-show="${k}">–</span></div>`).join('');
  if (b.img) return `<div class="sub-head">📎 ${b.img==='mri'?'MRI / scan images & reports':b.img==='posture'?'Posture / clinical photographs':'Other reports / images'}</div>
    <div class="img-upload-area" data-upload="${b.img}"><div style="font-size:24px">🩻</div><div class="img-upload-text">Tap to add images (JPG / PNG)</div></div>
    <div class="img-previews" data-imgs="${b.img}"></div>`;
  return '';
}
let REGION = 'lumbar', SECTIONS = [];
function buildForm(rid) {
  REGION = rid; SECTIONS = buildSections(rid);
  const R = REGIONS[rid];
  $('#region-title').textContent = R.label + ' — Detailed Assessment';
  $$('.region-btn').forEach(b => b.classList.toggle('active', b.dataset.region === rid));
  $('#assessment-form').innerHTML = SECTIONS.map((s,n) => `
    <div class="section-card" id="sec-${s.id}">
      <div class="section-head" data-toggle="${s.id}"><span class="section-num">${n+1}</span><span class="section-title">${esc(s.t)}</span><span class="section-toggle">▼</span></div>
      <div class="section-body">${s.b.map(blockHTML).join('')}</div>
    </div>`).join('');
  $('#sec-nav').innerHTML = SECTIONS.map((s,n)=>`<button data-jump="${s.id}">${n+1}. ${esc(s.t.split(/ [—&(]/)[0])}</button>`).join('');
}

// ═════════════════════════════════════════════════════════════════
// VALUE GET / SET
// ═════════════════════════════════════════════════════════════════
let IMAGES = { mri:[], posture:[], other:[] };
function getVals() {
  const v = {};
  $$('#assessment-form [data-k]').forEach(el => {
    const k = el.dataset.k; let val;
    if (el.classList.contains('chips')) { const sel = $$('.chip.sel', el).map(c => c.dataset.v); val = el.dataset.multi ? sel : (sel[0] || ''); }
    else if (el.classList.contains('pn')) val = el.dataset.val || '';
    else if (el.dataset.nprs) val = el.dataset.set ? el.value : '';
    else val = el.value;
    if (has(val)) v[k] = val;
  });
  return v;
}
function setVals(v) {
  $$('#assessment-form [data-k]').forEach(el => {
    const k = el.dataset.k, val = v[k];
    if (el.classList.contains('chips')) { const arr = Array.isArray(val) ? val : has(val) ? [String(val)] : []; $$('.chip', el).forEach(c => c.classList.toggle('sel', arr.includes(c.dataset.v))); }
    else if (el.classList.contains('pn')) { el.dataset.val = val || ''; $$('.pn-btn', el).forEach(b => b.classList.toggle('on', b.dataset.v === val)); }
    else if (el.dataset.nprs) { el.value = has(val) ? val : 0; if (has(val)) el.dataset.set = '1'; else delete el.dataset.set; }
    else el.value = has(val) ? val : '';
  });
  $$('[data-nprs]').forEach(updNprs);
}
function updNprs(el) {
  const s = $(`[data-show="${el.dataset.k}"]`);
  if (s) { s.textContent = el.dataset.set ? el.value : '–'; s.style.color = !el.dataset.set ? '' : el.value>=7 ? 'var(--red)' : el.value>=4 ? 'var(--amber)' : 'var(--green)'; }
}
function renderImages() {
  Object.keys(IMAGES).forEach(g => { const box = $(`[data-imgs="${g}"]`); if (box) box.innerHTML = IMAGES[g].map((src,i)=>`<div class="img-thumb"><img src="${src}" alt=""><button type="button" data-delimg="${g}.${i}">✕</button></div>`).join(''); });
}

// ═════════════════════════════════════════════════════════════════
// AUTO-CALCULATIONS  (each returns {html, lvl, val} or null)
// ═════════════════════════════════════════════════════════════════
function sideCmp(label, l, r, invSide, higherBetter=true, unit='') {
  if (!l || !r) return null;
  let inv, un;
  if (invSide === 'Left') { inv = l; un = r; } else if (invSide === 'Right') { inv = r; un = l; }
  else if (higherBetter) { inv = Math.min(l,r); un = Math.max(l,r); } else { inv = Math.max(l,r); un = Math.min(l,r); }
  const lsi = Math.round((higherBetter ? inv/un : un/inv) * 100);
  return `${esc(label)} L <b>${l}${unit}</b> / R <b>${r}${unit}</b> → LSI <b>${lsi}%</b>${lsi<90?' ⚠ (< 90%)':''}`;
}
const CALC = {
  bmi(v) { const h=num(v['pt.ht']), w=num(v['pt.wt']); if(!h||!w) return null; const b=w/Math.pow(h/100,2);
    const cat=b<18.5?'Underweight':b<23?'Normal (Asian cut-off)':b<25?'Overweight (Asian cut-off)':b<30?'Pre-obese / overweight':'Obese';
    return {html:`BMI: <b>${b.toFixed(1)} kg/m²</b> — ${cat}`, lvl:b>=30?'warn':''}; },
  rf(v, {secs}) {
    const rows = listRows(secs,'rf'); if (!rows.some((r,i)=>has(v['rf.'+i]))) return null;
    const yes = rows.filter((r,i)=>v['rf.'+i]==='yes'); const urg = yes.filter(r=>r[2]===1);
    if (urg.length) return {html:`🚨 <b>${urg.length} urgent red flag(s)</b>: ${[...new Set(urg.map(r=>esc(r[1])))].join(', ')} — URGENT referral. Total red flags: ${yes.length}`, lvl:'alert'};
    if (yes.length) return {html:`⚠️ <b>${yes.length} red flag(s)</b>: ${[...new Set(yes.map(r=>esc(r[1])))].join(', ')} — consider medical review before treatment.`, lvl:'alert'};
    return {html:'✅ <b>No red flags</b> identified on screening.'}; },
  yf(v, {secs}) { const rows=listRows(secs,'yf'); if(!rows.some((r,i)=>has(v['yf.'+i]))) return null; const n=rows.filter((r,i)=>v['yf.'+i]==='yes').length;
    return {html:`Yellow flags present: <b>${n} / ${rows.length}</b>${n>=3?' — high psychosocial risk; consider CBT-informed / graded approach.':''}`, lvl:n>=3?'warn':''}; },
  clusters(v, {secs, R}) {
    const out = (R.clusters||[]).map(c => {
      const hits = c.items.map(it => { const [p, s] = it.split('|'); const sides = stPosSides(v, secs, p); return s ? sides.includes(s) : sides.length > 0; });
      const tested = c.items.some(it => stTested(v, secs, it.split('|')[0]));
      if (!tested) return null; const n = hits.filter(Boolean).length, pos = n >= c.need;
      return {pos, html:`${esc(c.n)}: <b>${n}/${c.items.length}</b> → <b>${pos?'POSITIVE — '+esc(c.msg):'Negative'}</b> <span class="dim">(≥ ${c.need} needed)</span>`};
    }).filter(Boolean);
    return out.length ? {html:out.map(o=>o.html).join('<br>'), lvl:out.some(o=>o.pos)?'warn':''} : null; },
  fabq(v) { const pa=num(v['om.fabqpa']), w=num(v['om.fabqw']); if(pa===null&&w===null) return null; const p=[];
    if(pa!==null) p.push(`FABQ-PA <b>${pa}</b>${pa>15?' (elevated > 15)':''}`); if(w!==null) p.push(`FABQ-W <b>${w}</b>${w>34?' (high risk of not returning to work)':w<19?' (< 19 favours manipulation)':''}`);
    return {html:p.join(' · '), lvl:(pa>15||w>34)?'warn':''}; },
  mcgill(v) { const e=num(v['core.bs']), f=num(v['core.flex']), l=num(v['core.sbl']), r=num(v['core.sbr']); const p=[];
    if(e&&f){const x=f/e;p.push(`Flexor : extensor <b>${x.toFixed(2)}</b>${x>1?' ⚠ (> 1.0)':''}`);}
    if(l&&r){const x=r/l;p.push(`Side bridge R : L <b>${x.toFixed(2)}</b>${Math.abs(1-x)>0.05?' ⚠ (> 0.05 asymmetry)':''}`);}
    if(e&&(l||r)){const x=(l||r)/e;p.push(`Side bridge : extensor <b>${x.toFixed(2)}</b>${x>0.75?' ⚠ (> 0.75)':''}`);}
    if(e!==null)p.push(`Sørensen <b>${e}s</b>${e<176?' (< 176 s ↑ LBP risk)':''}`);
    return p.length?{html:'McGill endurance: '+p.join(' · ')}:null; },
  spine(v, {secs}) { const lv = listRows(secs,'mrid').map(r=>r[0]); if (!lv.length) return null; const rows=[];
    let hdr = []; eachBlock(secs, b => { if (b.tbl?.k==='mric') hdr = b.tbl.cols; });
    lv.forEach((l,i)=>{ const disc=v[`mrid.${i}.0`], loc=v[`mrid.${i}.1`], canal=v[`mric.${i}.0`], root=v[`mric.${i}.6`], lis=v[`mric.${i}.11`], cord=v[`mric.${i}.9`]; const bits=[];
      if(disc&&disc!=='Normal') bits.push(disc+(loc?` (${loc})`:'')); if(canal&&canal!=='None') bits.push(`${canal} canal stenosis`);
      [2,3,4,5].forEach(c=>{const x=v[`mric.${i}.${c}`]; if(x&&x!=='None') bits.push(`${x} ${hdr[c]?.h||''} stenosis`);});
      if(root) bits.push('root: '+root); if(lis&&lis!=='None') bits.push(lis); if(cord&&!['Normal','No'].includes(cord)) bits.push('cord / facet: '+cord);
      if(bits.length) rows.push(`<b>${esc(l)}</b>: ${esc(bits.join(', '))}`); });
    return rows.length?{html:'MRI summary — '+rows.join('<br>'), list:rows}:null; },
  psfs(v) { const s=[0,1,2,3,4].map(i=>num(v[`psfs.${i}.1`])).filter(x=>x!==null); return s.length?{html:`PSFS mean: <b>${(s.reduce((a,b)=>a+b,0)/s.length).toFixed(1)}/10</b> (MCID ≈ 2 points)`}:null; },
  cva(v) { const a=num(v['obs.cva']); return a===null?null:{html:`Craniovertebral angle <b>${a}°</b> — ${a<49?'forward head posture (< 49°)':'within normal range'}`, lvl:a<49?'warn':''}; },
  grip(v) { const p=[]; const g=sideCmp('Grip', num(v['grip.l']), num(v['grip.r']), null, true, ' kg'); if(g) p.push(g);
    const pl=num(v['pfg.l']), pr=num(v['pfg.r']); if(pl&&pr) p.push(`Pain-free grip ratio (weaker/stronger) <b>${Math.round(Math.min(pl,pr)/Math.max(pl,pr)*100)}%</b>`);
    return p.length?{html:p.join('<br>')+' <span class="dim">(dominant hand normally ≈ 10% stronger)</span>'}:null; },
  gird(v, {secs}) { const ir=rowIdx(secs,'rom','IR at 90'), er=rowIdx(secs,'rom','ER at 90'); if(ir<0||er<0) return null;
    const g=(i,side)=>num(v[`rom.${i}.${side==='L'?1:3}`])??num(v[`rom.${i}.${side==='L'?0:2}`]);
    const irl=g(ir,'L'), irr=g(ir,'R'), erl=g(er,'L'), err=g(er,'R'); if(irl===null||irr===null) return null;
    const p=[`IR L <b>${irl}°</b> / R <b>${irr}°</b> — deficit <b>${Math.abs(irl-irr)}°</b>${Math.abs(irl-irr)>=20?' ⚠ GIRD (≥ 20°)':''}`];
    if(erl!==null&&err!==null){const tl=irl+erl, tr=irr+err; p.push(`Total rotation arc L <b>${tl}°</b> / R <b>${tr}°</b>${Math.abs(tl-tr)>5?' ⚠ (> 5° difference)':''}`);}
    return {html:p.join('<br>'), lvl:Math.abs(irl-irr)>=20?'warn':''}; },
  erir(v) { const p=[]; ['l','r'].forEach(s=>{const e=num(v['hhd.er'+s]), i=num(v['hhd.ir'+s]); if(e&&i){const x=Math.round(e/i*100); p.push(`ER:IR ${s.toUpperCase()} <b>${x}%</b>${x<66?' ⚠ (< 66%)':''}`);}});
    const c=sideCmp('ER strength', num(v['hhd.erl']), num(v['hhd.err']), v['pt.side'], true); if(c) p.push(c);
    const g=sideCmp('Grip', num(v['grip.l']), num(v['grip.r']), v['pt.side'], true, ' kg'); if(g) p.push(g);
    return p.length?{html:p.join('<br>')}:null; },
  addabd(v) { const p=[]; ['l','r'].forEach(s=>{const a=num(v['hhd.add'+s]), b=num(v['hhd.abd'+s]); if(a&&b){const x=a/b; p.push(`ADD:ABD ${s.toUpperCase()} <b>${x.toFixed(2)}</b>${x<0.8?' ⚠ (< 0.8 ↑ groin injury risk)':''}`);}});
    const c=sideCmp('Abduction', num(v['hhd.abdl']), num(v['hhd.abdr']), v['pt.side'], true); if(c) p.push(c); return p.length?{html:p.join('<br>')}:null; },
  lsi(v) { const side=v['inv.side']||v['pt.side']; const p=[];
    const q=sideCmp('Quadriceps', num(v['hhd.ql']), num(v['hhd.qr']), side, true); if(q) p.push(q);
    const h=sideCmp('Hamstrings', num(v['hhd.hl']), num(v['hhd.hr']), side, true); if(h) p.push(h);
    ['l','r'].forEach(s=>{const hh=num(v['hhd.h'+s]), qq=num(v['hhd.q'+s]); if(hh&&qq){const x=hh/qq; p.push(`H:Q ${s.toUpperCase()} <b>${x.toFixed(2)}</b>${x<0.6?' ⚠ (< 0.6)':''}`);}});
    return p.length?{html:p.join('<br>')+' <span class="dim">(RTS target LSI ≥ 90%)</span>'}:null; },
  hop(v, {secs}) { const side=v['inv.side']||v['pt.side']; const rows=listRows(secs,'hop'); const p=[];
    rows.forEach((r,i)=>{ const hb=!/\(s\)/.test(r[0]); const c=sideCmp(r[0], num(v[`hop.${i}.0`]), num(v[`hop.${i}.1`]), side, hb); if(c) p.push(c); });
    return p.length?{html:'Hop tests — '+p.join('<br>')}:null; },
  fpi(v) { const p=[]; [['L',0],['R',1]].forEach(([s,c])=>{ const x=[0,1,2,3,4,5].map(i=>v[`fpi.${i}.${c}`]).filter(has); if(!x.length) return;
      const t=x.reduce((a,b)=>a+parseInt(b),0); const cat=t>=10?'highly pronated':t>=6?'pronated':t>=0?'normal':t>=-4?'supinated':'highly supinated';
      p.push(`FPI-6 ${s}: <b>${t>0?'+':''}${t}</b> — ${cat}${x.length<6?` (${x.length}/6)`:''}`); });
    return p.length?{html:p.join(' · ')}:null; },
  lunge(v) { const l=num(v['rom.lungel']), r=num(v['rom.lunger']); if(l===null&&r===null) return null; const p=[];
    if(l!==null) p.push(`L <b>${l} cm</b>`); if(r!==null) p.push(`R <b>${r} cm</b>`);
    const low=[l,r].some(x=>x!==null&&x<9), diff=l!==null&&r!==null&&Math.abs(l-r)>=2;
    return {html:`Weight-bearing lunge: ${p.join(' / ')}${low?' ⚠ restricted (< 9 cm)':''}${diff?' ⚠ asymmetry ≥ 2 cm':''}`, lvl:(low||diff)?'warn':''}; },
  heelraise(v) { const c=sideCmp('Heel raises', num(v['hr.l']), num(v['hr.r']), v['inv.side']||v['pt.side'], true); return c?{html:c+' <span class="dim">(norm ≈ 25 reps)</span>'}:null; },
  ybal(v) { const g=(i,c)=>num(v[`ybal.${i}.${c}`]); const p=[];
    [['L',0],['R',1]].forEach(([s,c])=>{ const a=g(0,c),pm=g(1,c),pl=g(2,c),ll=g(3,c); if(a&&pm&&pl&&ll){const comp=Math.round((a+pm+pl)/(3*ll)*1000)/10; p.push(`Composite ${s} <b>${comp}%</b>${comp<94?' ⚠ (< 94%)':''}`);} });
    const al=g(0,0), ar=g(0,1); if(al&&ar) p.push(`Anterior reach difference <b>${Math.abs(al-ar)} cm</b>${Math.abs(al-ar)>4?' ⚠ (> 4 cm injury risk)':''}`);
    return p.length?{html:'Y-balance: '+p.join(' · ')}:null; },
  ny(v) { const g=i=>{const x=v[`nygr.${i}.0`]; return x?parseInt(x):null;}; const l=g(0), r=g(1); if(l===null&&r===null) return null;
    const pos=(l>=2&&r>=2)||(l>=3)||(r>=3);
    return {html:`Modified New York radiographic criterion: <b>${pos?'MET — radiographic sacroiliitis':'not met'}</b> (L grade ${l??'—'}, R grade ${r??'—'}; needs bilateral ≥ 2 or unilateral ≥ 3)`, lvl:pos?'warn':''}; },
};
function runCalc(name, v, ctx) {
  if (name.startsWith('q:')) { const Q = QDEF[name.slice(2)]; const a = Q.items.map((_,i)=>has(v[`${name.slice(2)}.${i}`])?Number(v[`${name.slice(2)}.${i}`]):null);
    const r = Q.score(a, Q.items); return r ? {html:r.txt, lvl:r.lvl, val:r.val} : null; }
  if (name.startsWith('cl:')) { const k = name.slice(3); let c; eachBlock(ctx.secs, b => { if (b.cl) b.cl.forEach(x => { if (x.k===k) c = x; }); });
    const n = (v[k]||[]).length; if (!c || !n) return null; const pos = n >= c.need;
    return {html:`${esc(c.l)}: <b>${n}/${c.o.length}</b> → <b>${pos?'POSITIVE — '+esc(c.msg):'below threshold'}</b>`, lvl:pos?'warn':''}; }
  return CALC[name] ? CALC[name](v, ctx) : null;
}
function recompute() {
  const v = getVals(), ctx = {secs:SECTIONS, R:REGIONS[REGION]};
  $$('[data-calc]').forEach(el => { const r = runCalc(el.dataset.calc, v, ctx); el.style.display = r ? '' : 'none'; el.className = 'calc' + (r?.lvl ? ' '+r.lvl : ''); if (r) el.innerHTML = r.html; });
  SECTIONS.forEach(s => { const card = $('#sec-'+s.id); const filled = $$('[data-k]', card).some(el => { const k=el.dataset.k; return has(v[k]) && k!=='pt.date' && k!=='sign.date'; }); $(`[data-jump="${s.id}"]`)?.classList.toggle('filled', filled); });
  return v;
}

// ═════════════════════════════════════════════════════════════════
// STORAGE — IndexedDB (records) + localStorage (draft)
// ═════════════════════════════════════════════════════════════════
let db = null, RECORDS = [], currentId = null;
const DRAFT_KEY = 'jointspace_proforma_draft';
function initDB() {
  return new Promise(res => {
    try {
      const rq = indexedDB.open('JointSpaceProformaDB', 1);
      rq.onupgradeneeded = e => { const d = e.target.result; if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath:'id' }); };
      rq.onsuccess = e => { db = e.target.result; const tx = db.transaction('records','readonly').objectStore('records').getAll(); tx.onsuccess = () => { RECORDS = tx.result || []; res(); }; tx.onerror = () => res(); };
      rq.onerror = () => res();
    } catch (e) { res(); }
  });
}
function dbPut(rec) { return new Promise(res => { const i = RECORDS.findIndex(r => r.id === rec.id); if (i >= 0) RECORDS[i] = rec; else RECORDS.push(rec); if (!db) return res();
  try { const tx = db.transaction('records','readwrite'); tx.objectStore('records').put(rec); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }
function dbDel(id) { return new Promise(res => { RECORDS = RECORDS.filter(r => r.id !== id); if (!db) return res();
  try { const tx = db.transaction('records','readwrite'); tx.objectStore('records').delete(id); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }
let draftTimer;
function saveDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ region:REGION, v:getVals(), images:IMAGES, id:currentId })); } catch (e) {} }, 500); }
function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } }
function clearDraft() { clearTimeout(draftTimer); try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
function updateBadge() { const b = $('#rec-badge'); b.textContent = RECORDS.length; b.classList.toggle('show', RECORDS.length > 0); }
function setEditing(id) { currentId = id; const f = $('#edit-flag'); const r = RECORDS.find(x => x.id === id);
  f.textContent = r ? `✎ Editing saved record — ${r.v['pt.name']||'Unnamed'}` : ''; f.classList.toggle('show', !!r); }
function loadInto(rid, v, images, id) {
  buildForm(rid); setVals(v || {});
  IMAGES = { mri:[], posture:[], other:[], ...(images ? JSON.parse(JSON.stringify(images)) : {}) };
  renderImages(); setEditing(id ?? null); recompute();
}
function newForm(rid, carry) {
  loadInto(rid, { 'pt.date':today(), 'sign.date':today(), ...(carry||{}) }, null, null);
  clearDraft(); $('#sec-pt').classList.add('open'); window.scrollTo({ top:0 });
}
function hasClinicalData(v) { return Object.keys(v).some(k => !k.startsWith('pt.') && !k.startsWith('pmh.') && k!=='sign.date'); }
function carryOver(v) { const c = {}; Object.keys(v).filter(k=>k.startsWith('pt.')||k.startsWith('pmh.')).forEach(k=>c[k]=v[k]); return c; }
// In-app confirm dialog (window.confirm is blocked in many app wrappers / WebViews)
function askConfirm(msg, okLabel='OK') {
  return new Promise(res => {
    const d = $('#confirm-dlg'); $('#confirm-msg').textContent = msg; $('#confirm-ok').textContent = okLabel; d.classList.add('open');
    const done = val => { d.classList.remove('open'); $('#confirm-ok').onclick = $('#confirm-cancel').onclick = null; res(val); };
    $('#confirm-ok').onclick = () => done(true); $('#confirm-cancel').onclick = () => done(false);
  });
}
async function switchRegion(rid) {
  if (rid === REGION) return;
  const v = getVals();
  if (hasClinicalData(v) && !await askConfirm(`Switch to ${REGIONS[rid].label}? Patient details are kept; findings entered for ${REGIONS[REGION].label} will be cleared (save first if needed).`, 'Switch')) return;
  newForm(rid, carryOver(v)); showToast(`${REGIONS[rid].icon} ${REGIONS[rid].label}`);
}
async function saveAssessment() {
  const v = recompute();
  if (!has(v['pt.name'])) { showToast('⚠️ Enter patient name first'); openSection('pt'); return; }
  const old = RECORDS.find(r => r.id === currentId);
  const rec = { id: currentId || Date.now(), region: REGION, createdAt: old?.createdAt || new Date().toISOString(), savedAt: new Date().toISOString(), v, images: IMAGES };
  await dbPut(rec); setEditing(rec.id); clearDraft(); updateBadge();
  showToast('✅ Saved — ' + v['pt.name']);
}

// ═════════════════════════════════════════════════════════════════
// REPORT — line-by-line detail of every recorded item
// ═════════════════════════════════════════════════════════════════
const fmt = val => Array.isArray(val) ? val.join(', ') : val;
const PN_TXT = { pos:'POS', neg:'NEG', na:'N/A', yes:'YES', no:'NO' };
const pnTag = x => x ? `<span class="tag ${x==='pos'||x==='yes'?'pos':x==='neg'||x==='no'?'ok':'info'}">${PN_TXT[x]}</span>` : '—';
function calcBox(r) { return r ? `<div class="calc ${r.lvl||''}" style="margin:6px 0">${r.html}</div>` : ''; }
function repBlock(b, v, rec, ctx) {
  if (b.f) { const items = b.f.filter(f => has(v[f.k])); if (!items.length) return '';
    return `<div class="rep-kv">${items.map(f=>`<div class="${f.t==='ta'||f.full?'full':''}"><b>${esc(f.l.replace(' *',''))}:</b> ${esc(fmt(v[f.k]))}${f.u&&!Array.isArray(v[f.k])?' '+esc(f.u):''}</div>`).join('')}</div>`; }
  if (b.tbl) { const tb = b.tbl; let ri = 0; const rows = [];
    tb.rows.forEach(r => { if (!isRow(r)) return; const i = ri++; const cells = tb.cols.map((c,ci)=>v[`${tb.k}.${i}.${ci}`]);
      if (cells.some(has)) rows.push(`<tr><td><b>${esc(r[0])}</b>${r[1]?`<br><span class="dim" style="font-size:10px">${esc(r[1])}</span>`:''}</td>${cells.map(x=>`<td>${has(x)?esc(x):'—'}</td>`).join('')}</tr>`); });
    return rows.length ? `<div style="overflow-x:auto"><table class="rep-table"><thead><tr><th>Item</th>${tb.cols.map(c=>`<th>${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : ''; }
  if (b.tests) { const ts = b.tests; let ri = 0, grp = null; const rows = [];
    ts.rows.forEach(r => { if (!isRow(r)) { grp = r.g; return; } const i = ri++;
      if (ts.yn) { const x = v[`${ts.k}.${i}`]; if (has(x)) rows.push({grp, html:`<tr><td>${esc(r[0])}<br><span class="dim" style="font-size:10px">${esc(r[1])}</span></td><td>${pnTag(x)}</td></tr>`}); return; }
      const L=v[`${ts.k}.${i}.L`], Rr=v[`${ts.k}.${i}.R`], C=v[`${ts.k}.${i}.C`], F=v[`${ts.k}.${i}.f`];
      if ([L,Rr,C,F].some(has)) rows.push({grp, html:`<tr><td><b>${esc(r[0])}</b><br><span class="dim" style="font-size:10px">${esc(r[1])}</span></td>${r[2]===2?`<td>${pnTag(L)}</td><td>${pnTag(Rr)}</td>`:`<td colspan="2" style="text-align:center">${pnTag(C)}</td>`}<td>${esc(F||'')}</td></tr>`}); });
    if (!rows.length) return ''; let last = null; const cols = ts.yn ? 2 : 4;
    const body = rows.map(x => { const g = x.grp && x.grp!==last ? `<tr><td colspan="${cols}" class="rep-grp">${esc(x.grp)}</td></tr>` : ''; last = x.grp; return g + x.html; }).join('');
    return `<table class="rep-table"><thead><tr>${ts.yn?'<th>Item</th><th>Present</th>':'<th>Test</th><th>Left</th><th>Right</th><th>Findings</th>'}</tr></thead><tbody>${body}</tbody></table>`; }
  if (b.nprs) { const items = b.nprs.filter(([k])=>has(v[k])); return items.length ? `<div>${items.map(([k,l])=>{const n=+v[k];return `<span class="tag ${n>=7?'pos':n>=4?'info':'ok'}">${esc(l)}: ${n}/10</span>`;}).join('')}</div>` : ''; }
  if (b.q) { const Q = QDEF[b.q]; const ans = Q.items.map(([t,o],i)=>{const x=v[`${b.q}.${i}`]; if(!has(x)) return ''; const opt=o[+x]; return `<tr><td>${esc(t)}</td><td>${esc(Array.isArray(opt)?opt[0]:opt)} <b>(${Array.isArray(opt)?opt[1]:x})</b></td></tr>`;}).join('');
    return ans ? `<div class="rep-sub">${esc(Q.t)}</div><table class="rep-table"><tbody>${ans}</tbody></table>${calcBox(runCalc('q:'+b.q, v, ctx))}` : ''; }
  if (b.cl) return b.cl.map(c => has(v[c.k]) ? `<div class="rep-kv"><div class="full"><b>${esc(c.l)}:</b> ${esc(fmt(v[c.k]))}</div></div>${calcBox(runCalc('cl:'+c.k, v, ctx))}` : '').join('');
  if (b.calc) return calcBox(runCalc(b.calc, v, ctx));
  if (b.img) { const im = (rec.images||{})[b.img]||[]; return im.length ? `<div class="rep-imgs">${im.map(src=>`<img src="${src}" alt="">`).join('')}</div>` : ''; }
  return '';
}
function positiveTests(v, secs) { return listRows(secs,'st').map((r,i)=>{ const s=['L','R','C'].filter(x=>v[`st.${i}.${x}`]==='pos'); return s.length ? r[0]+(s[0]!=='C'?' ('+s.join('/')+')':'') : null; }).filter(Boolean); }
function keySummary(v, ctx) {
  const {secs, R} = ctx, out = [];
  const rf = listRows(secs,'rf').filter((r,i)=>v['rf.'+i]==='yes');
  if (rf.length) out.push(`<div><b style="color:var(--red)">Red flags:</b> ${rf.map(r=>`<span class="tag pos">${esc(r[0])}</span>`).join('')}</div>`);
  const pos = positiveTests(v, secs);
  if (pos.length) out.push(`<div><b>Positive special tests (${pos.length}):</b> ${pos.map(p=>`<span class="tag pos">${esc(p)}</span>`).join('')}</div>`);
  const weak = [];
  eachBlock(secs, b => { if (!b.tbl?.mmt) return; b.tbl.rows.filter(isRow).forEach((r,i)=>[['L',0],['R',1]].forEach(([s,c])=>{ const g=v[`${b.tbl.k}.${i}.${c}`]; if (g && g!=='5' && g!=='NT') weak.push(`${r[0].split(' — ')[0]} ${s} ${g}/5`); })); });
  if (weak.length) out.push(`<div><b>Weakness:</b> ${weak.map(w=>`<span class="tag info">${esc(w)}</span>`).join('')}</div>`);
  const neuro = [];
  listRows(secs,'derm').forEach((r,i)=>[0,1,2,3].forEach(c=>{ const x=v[`derm.${i}.${c}`]; if (x && x!=='Normal') neuro.push(`${r[0]} ${['L LT','R LT','L PP','R PP'][c]}: ${x}`); }));
  listRows(secs,'pns').forEach((r,i)=>[0,1].forEach(c=>{ const x=v[`pns.${i}.${c}`]; if (x && x!=='Normal') neuro.push(`${r[0]} ${c?'R':'L'}: ${x}`); }));
  listRows(secs,'refl').forEach((r,i)=>[0,1].forEach(c=>{ const x=v[`refl.${i}.${c}`]; if (x && !x.startsWith('2+')) neuro.push(`${r[0]} ${c?'R':'L'}: ${x}`); }));
  listRows(secs,'umn').forEach((r,i)=>[0,1].forEach(c=>{ if (v[`umn.${i}.${c}`]==='Positive') neuro.push(`${r[0]} ${c?'R':'L'} +`); }));
  if (neuro.length) out.push(`<div><b>Neuro findings:</b> ${neuro.map(w=>`<span class="tag pos">${esc(w)}</span>`).join('')}</div>`);
  const names = [];
  eachBlock(secs, b => { if (b.q) names.push('q:'+b.q); if (b.cl) b.cl.forEach(c=>names.push('cl:'+c.k)); });
  ['clusters','bmi',...(R.summary||[])].forEach(n=>names.push(n));
  names.forEach(n => { const r = runCalc(n, v, ctx); if (r) out.push(calcBox(r)); });
  return out.join('');
}
function buildReport(rec) {
  const v = rec.v || {}, rid = rec.region || 'lumbar', R = REGIONS[rid], secs = buildSections(rid), ctx = {secs, R};
  const date = v['pt.date'] ? new Date(v['pt.date']).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '';
  let html = `<div class="rep-banner"><div class="t">Joint Space Physiotherapy</div>
    <div class="s">${esc(R.label)} Assessment Proforma${date?' · '+esc(date):''}</div>
    <div style="margin-top:6px;font-size:13px"><b>${esc(v['pt.name']||'Patient')}</b>${v['pt.age']?' · '+esc(v['pt.age'])+' yrs':''}${v['pt.sex']?' · '+esc(v['pt.sex']):''}${v['pt.side']?' · '+esc(v['pt.side'])+' side':''}${v['pt.case']?' · Case '+esc(v['pt.case']):''}</div>
    ${v['dx.primary']?`<div style="margin-top:4px;font-size:12.5px;color:var(--blue);font-weight:800">Dx: ${esc(v['dx.primary'])}${v['dx.level']?.length?' — '+esc(v['dx.level'].join(', ')):''}${v['dx.side']?' ('+esc(v['dx.side'])+')':''}${v['dx.grade']?' · '+esc(v['dx.grade']):''}</div>`:''}</div>`;
  const ks = keySummary(v, ctx);
  if (ks) html += `<div class="rep-sec"><div class="rep-sec-head">★ Key findings summary</div><div class="rep-sec-body">${ks}</div></div>`;
  secs.forEach((s, n) => {
    let body = '', pend = '';
    s.b.forEach(b => { if (b.h) { pend = b.h; return; } if (b.note) return; const h = repBlock(b, v, rec, ctx);
      if (h) { if (pend) { body += `<div class="rep-sub">${esc(pend)}</div>`; pend = ''; } body += h; } });
    if (body) html += `<div class="rep-sec"><div class="rep-sec-head">${n+1}. ${esc(s.t)}</div><div class="rep-sec-body">${body}</div></div>`;
  });
  html += `<div class="sign-line"><div>Patient / guardian signature</div><div>${esc(v['sign.by']||'Physiotherapist')}${v['sign.qual']?', '+esc(v['sign.qual']):''}${v['sign.reg']?' · Reg '+esc(v['sign.reg']):''}</div></div>
  <div class="rep-foot">Joint Space Physiotherapy · Confidential Patient Record · Where Science Meets Movement</div>`;
  return html;
}
function openReport(rec) {
  $('#modal-title').textContent = `${rec.v['pt.name'] || 'Patient'} — ${REGIONS[rec.region||'lumbar'].label}`;
  $('#modal-body').innerHTML = buildReport(rec);
  $('#view-modal').classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeReport() { $('#view-modal').classList.remove('open'); document.body.style.overflow = ''; }

// ═════════════════════════════════════════════════════════════════
// RECORDS LIST
// ═════════════════════════════════════════════════════════════════
function primaryScore(rec) {
  const secs = buildSections(rec.region||'lumbar'); let q = null; eachBlock(secs, b => { if (b.q && !q) q = b.q; });
  if (!q) return null; const r = runCalc('q:'+q, rec.v, {secs}); return r && r.val !== null && r.val !== undefined ? `${QDEF[q].short} ${r.val}${typeof r.val==='number'&&['odi','ndi','spadi'].includes(q)?'%':''}` : null;
}
function renderRecords() {
  const q = ($('#rec-search').value || '').toLowerCase(), rf = $('#rec-region').value;
  const all = RECORDS.slice().sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
  const list = all.filter(r => (!rf || r.region===rf) && (!q || [r.v['pt.name'],r.v['pt.case'],r.v['dx.primary'],fmt(r.v['dx.level']||''),r.v['hx.cc'],r.v['pt.phone'],REGIONS[r.region]?.label].join(' ').toLowerCase().includes(q)));
  const cnt = {}; all.forEach(r => cnt[r.region] = (cnt[r.region]||0)+1);
  const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  $('#rec-stats').innerHTML = `<div class="stat-mini"><div class="sm-val">${all.length}</div><div class="sm-lbl">Total saved</div></div>
    <div class="stat-mini"><div class="sm-val">${list.length}</div><div class="sm-lbl">Showing</div></div>
    <div class="stat-mini"><div class="sm-val" style="font-size:15px;line-height:1.3">${top?esc(REGIONS[top[0]]?.short||top[0]):'—'}</div><div class="sm-lbl">Most assessed</div></div>`;
  if (!list.length) { $('#records-list').innerHTML = `<div class="empty-state"><div style="font-size:42px">${all.length?'🔍':'📭'}</div><h3>${all.length?'No matches':'No assessments yet'}</h3>${all.length?'Try another search or region.':'Complete an assessment and tap Save.'}</div>`; return; }
  $('#records-list').innerHTML = list.map(r => {
    const v = r.v, R = REGIONS[r.region] || REGIONS.lumbar, secs = buildSections(r.region||'lumbar');
    const rfc = runCalc('rf', v, {secs, R}), pos = positiveTests(v, secs), ps = primaryScore(r);
    const d = new Date(v['pt.date'] || r.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    return `<div class="rec-card">
      <div style="display:flex;gap:9px;align-items:flex-start"><span style="font-size:26px">${R.icon}</span><div style="flex:1;min-width:0">
        <div class="rec-name">${esc(v['pt.name']||'Unnamed')}</div><div class="rec-date">📅 ${esc(d)}${v['pt.therapist']?' · '+esc(v['pt.therapist']):''}</div></div>
        <span class="rec-region">${esc(R.short)}</span></div>
      <div class="rec-tags">
        ${v['pt.case']?`<span class="rec-tag">Case ${esc(v['pt.case'])}</span>`:''}${v['pt.age']?`<span class="rec-tag">${esc(v['pt.age'])} yrs${v['pt.sex']?' · '+esc(v['pt.sex']):''}</span>`:''}
        ${v['pt.side']?`<span class="rec-tag">${esc(v['pt.side'])}</span>`:''}${v['dx.primary']?`<span class="rec-tag blue">${esc(v['dx.primary'])}</span>`:''}${ps?`<span class="rec-tag">${esc(ps)}</span>`:''}
        ${rfc?.lvl==='alert'?`<span class="rec-tag red">🚩 Red flags</span>`:''}
        ${pos.slice(0,4).map(p=>`<span class="rec-tag red">+${esc(p)}</span>`).join('')}${pos.length>4?`<span class="rec-tag red">+${pos.length-4} more</span>`:''}
      </div>
      ${v['hx.cc']?`<div style="font-size:12px;color:var(--ink3);font-style:italic;margin-bottom:8px">"${esc(v['hx.cc'].slice(0,120))}${v['hx.cc'].length>120?'…':''}"</div>`:''}
      <div class="rec-actions">
        <button class="rec-btn view" data-act="view" data-id="${r.id}">👁️ Report</button><button class="rec-btn" data-act="edit" data-id="${r.id}">✎ Edit</button>
        <button class="rec-btn" data-act="reassess" data-id="${r.id}">↻ Re-assess</button><button class="rec-btn del" data-act="del" data-id="${r.id}">🗑️</button>
      </div></div>`;
  }).join('');
}

// ═════════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═════════════════════════════════════════════════════════════════
function download(name, data, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data],{type})); a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); }
function exportCSV() {
  if (!RECORDS.length) return showToast('No records to export');
  const hdr = ['Name','Case no','Date','Age','Sex','Region','Side','Occupation','Chief complaint','Duration','NPRS current','NPRS worst','Diagnosis','Structure / level','Primary score','Red flags','Positive special tests','Therapist','Saved at'];
  const rows = RECORDS.map(r => { const v = r.v, secs = buildSections(r.region||'lumbar');
    const rf = listRows(secs,'rf').filter((x,i)=>v['rf.'+i]==='yes').map(x=>x[0]);
    return [v['pt.name'],v['pt.case'],v['pt.date'],v['pt.age'],v['pt.sex'],REGIONS[r.region]?.label,v['pt.side'],v['pt.occ'],v['hx.cc'],v['hx.dur'],v['nprs.now'],v['nprs.worst'],v['dx.primary'],fmt(v['dx.level']||''),primaryScore(r)||'',rf.join(' | '),positiveTests(v,secs).join(' | '),v['sign.by']||v['pt.therapist'],r.savedAt]; });
  const csv = [hdr,...rows].map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""').replace(/\n/g,' ')+'"').join(',')).join('\n');
  download('JointSpace_Assessments_' + today() + '.csv', '﻿' + csv, 'text/csv'); showToast('📥 CSV exported');
}
function exportJSON() { if (!RECORDS.length) return showToast('No records to back up'); download('JointSpace_Backup_' + today() + '.json', JSON.stringify(RECORDS), 'application/json'); showToast('💾 Backup downloaded'); }
async function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  try { const recs = JSON.parse(await file.text()); if (!Array.isArray(recs)) throw 0; let n = 0;
    for (const r of recs) if (r && r.id && r.v && typeof r.v === 'object') { if (!REGIONS[r.region]) r.region = 'lumbar'; await dbPut(r); n++; }
    updateBadge(); renderRecords(); showToast(`✅ Restored ${n} record(s)`);
  } catch (err) { showToast('⚠️ Invalid backup file'); }
  e.target.value = '';
}

// ═════════════════════════════════════════════════════════════════
// IMAGES — downscaled to keep records small
// ═════════════════════════════════════════════════════════════════
let uploadTarget = null;
function readImage(file) {
  return new Promise(res => { const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => { const max = 1400, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); }; img.onerror = () => res(null); img.src = fr.result; };
    fr.onerror = () => res(null); fr.readAsDataURL(file); });
}

// ═════════════════════════════════════════════════════════════════
// EVENTS
// ═════════════════════════════════════════════════════════════════
function openSection(id) { const c = $('#sec-'+id); c.classList.add('open'); c.scrollIntoView({ behavior:'smooth', block:'start' }); }
function switchPage(p) {
  $$('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.page === p));
  $$('.page').forEach(pg => pg.classList.toggle('active', pg.id === 'page-'+p));
  if (p === 'records') renderRecords(); window.scrollTo({ top:0 });
}
function bind() {
  $('#region-grid').innerHTML = Object.entries(REGIONS).map(([id,R])=>`<button class="region-btn" data-region="${id}"><span class="region-icon">${R.icon}</span><span class="region-label">${esc(R.short)}</span></button>`).join('');
  $('#rec-region').innerHTML = `<option value="">All regions</option>` + Object.entries(REGIONS).map(([id,R])=>`<option value="${id}">${R.icon} ${esc(R.short)}</option>`).join('');
  $('#region-grid').addEventListener('click', e => { const b = e.target.closest('[data-region]'); if (b) switchRegion(b.dataset.region); });
  $$('.nav-tab').forEach(t => t.addEventListener('click', () => switchPage(t.dataset.page)));
  const form = $('#assessment-form');
  form.addEventListener('click', e => {
    const tg = e.target.closest('[data-toggle]'); if (tg) { tg.parentElement.classList.toggle('open'); return; }
    const chip = e.target.closest('.chip');
    if (chip) { const box = chip.parentElement;
      if (box.dataset.multi) chip.classList.toggle('sel'); else { const was = chip.classList.contains('sel'); $$('.chip', box).forEach(c=>c.classList.remove('sel')); if (!was) chip.classList.add('sel'); }
      recompute(); saveDraft(); return; }
    const pb = e.target.closest('.pn-btn');
    if (pb) { const box = pb.parentElement, val = box.dataset.val === pb.dataset.v ? '' : pb.dataset.v;
      box.dataset.val = val; $$('.pn-btn', box).forEach(b => b.classList.toggle('on', b.dataset.v === val)); recompute(); saveDraft(); return; }
    const up = e.target.closest('[data-upload]'); if (up) { uploadTarget = up.dataset.upload; $('#img-input').click(); return; }
    const del = e.target.closest('[data-delimg]'); if (del) { const [g,i] = del.dataset.delimg.split('.'); IMAGES[g].splice(+i,1); renderImages(); saveDraft(); }
  });
  form.addEventListener('input', e => { if (e.target.dataset.nprs) { e.target.dataset.set = '1'; updNprs(e.target); } recompute(); saveDraft(); });
  $('#img-input').addEventListener('change', async e => { for (const f of e.target.files) { const d = await readImage(f); if (d) IMAGES[uploadTarget].push(d); } e.target.value = ''; renderImages(); saveDraft(); showToast('📎 Image(s) added'); });
  $('#sec-nav').addEventListener('click', e => { const b = e.target.closest('[data-jump]'); if (b) openSection(b.dataset.jump); });
  $('#btn-expand').onclick = () => $$('.section-card').forEach(c=>c.classList.add('open'));
  $('#btn-collapse').onclick = () => $$('.section-card').forEach(c=>c.classList.remove('open'));
  $('#btn-new').onclick = async () => { if (await askConfirm('Start a new blank assessment? Unsaved changes will be lost.', 'Start new')) { newForm(REGION); showToast('New assessment'); } };
  $('#btn-clear').onclick = async () => { if (await askConfirm('Clear all form data?', 'Clear')) { newForm(REGION); showToast('↺ Form cleared'); } };
  $('#btn-save').onclick = saveAssessment;
  $('#btn-report').onclick = () => openReport({ region:REGION, v: recompute(), images: IMAGES });
  $('#btn-close').onclick = closeReport;
  $('#btn-print').onclick = () => { document.body.classList.add('printing'); window.print(); };
  window.addEventListener('afterprint', () => document.body.classList.remove('printing'));
  $('#rec-search').addEventListener('input', renderRecords); $('#rec-region').addEventListener('change', renderRecords);
  $('#btn-csv').onclick = exportCSV; $('#btn-json').onclick = exportJSON; $('#btn-import').onclick = () => $('#import-file').click();
  $('#import-file').addEventListener('change', handleImport);
  $('#records-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = RECORDS.find(x => x.id === +b.dataset.id); if (!r) return;
    if (b.dataset.act === 'view') openReport(r);
    if (b.dataset.act === 'edit') { loadInto(r.region||'lumbar', r.v, r.images, r.id); switchPage('form'); $$('.section-card').forEach(c=>c.classList.add('open')); showToast('✎ Editing ' + (r.v['pt.name']||'record')); }
    if (b.dataset.act === 'reassess') { const keep = carryOver(r.v); keep['pt.date'] = today(); keep['sign.date'] = today(); const ps = primaryScore(r);
      keep['hx.hopi'] = `Re-assessment. Previous assessment ${r.v['pt.date']||''}${r.v['dx.primary']?' — '+r.v['dx.primary']:''}${ps?' — '+ps:''}.`;
      loadInto(r.region||'lumbar', keep, null, null); switchPage('form'); $('#sec-pt').classList.add('open'); showToast('↻ Re-assessment started'); }
    if (b.dataset.act === 'del' && await askConfirm('Delete this assessment permanently?', 'Delete')) { await dbDel(r.id); if (currentId === r.id) setEditing(null); updateBadge(); renderRecords(); showToast('🗑️ Deleted'); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeReport(); });
}

// INIT
bind();
const hashRegion = (location.hash||'').slice(1);
initDB().then(() => {
  updateBadge();
  const d = loadDraft();
  if (d && d.v && (hasClinicalData(d.v) || has(d.v['pt.name']))) {
    loadInto(REGIONS[d.region] ? d.region : 'lumbar', d.v, d.images, RECORDS.some(r=>r.id===d.id) ? d.id : null);
    showToast('📝 Unsaved draft restored');
  } else newForm(REGIONS[hashRegion] ? hashRegion : 'lumbar');
  $('#sec-pt').classList.add('open');
});
