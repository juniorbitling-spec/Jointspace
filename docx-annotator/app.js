/* DOCX Annotator — offline highlighter, note-taker and ink layer for .docx files.
 * Everything runs in the browser. Documents and annotations are stored in IndexedDB. */
'use strict';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const MC_NS = 'http://schemas.openxmlformats.org/markup-compatibility/2006';

const HL_COLORS = [
  { id: 'yellow',  css: '#fde047', word: 'yellow' },
  { id: 'green',   css: '#86efac', word: 'green' },
  { id: 'blue',    css: '#7dd3fc', word: 'cyan' },
  { id: 'pink',    css: '#f9a8d4', word: 'magenta' },
  { id: 'red',     css: '#fca5a5', word: 'red' },
];
const colorById = id => HL_COLORS.find(c => c.id === id) || HL_COLORS[0];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const norm = s => s.replace(/\s/g, ' ');
const closest = (t, sel) => (t && t.closest ? t.closest(sel) : null);

const state = {
  docId: null, name: '', bytes: null,
  tool: 'select', color: 'yellow',
  penColor: '#e11d48', penSize: 3, zoom: 1,
  ann: emptyAnn(), undo: [], redo: [],
  pages: [], pageSize: [],
};
function emptyAnn() { return { v: 1, highlights: [], strokes: [], texts: [] }; }

/* ===================== storage (IndexedDB) ===================== */
const db = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('docx-annotator', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('files', { keyPath: 'id' });
      r.result.createObjectStore('ann', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (s, k) => tx(s, 'readonly', o => o.get(k)).catch(() => null),
    put: (s, v) => tx(s, 'readwrite', o => o.put(v)).catch(e => console.warn('save failed', e)),
    del: (s, k) => tx(s, 'readwrite', o => o.delete(k)).catch(() => null),
    all: s => tx(s, 'readonly', o => o.getAll()).catch(() => []),
  };
})();

function hashBytes(u8) { // FNV-1a 32 + length → stable id for a file's content
  let h = 0x811c9dc5;
  for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16) + '-' + u8.length.toString(16);
}

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!state.docId) return;
    db.put('ann', { id: state.docId, ann: state.ann, updated: Date.now() });
    db.get('files', state.docId).then(f => { if (f) { f.updated = Date.now(); db.put('files', f); } });
  }, 250);
}

/* ===================== undo / redo ===================== */
function snapshot() {
  state.undo.push(JSON.stringify(state.ann));
  if (state.undo.length > 200) state.undo.shift();
  state.redo = [];
  updateUndoButtons();
}
function commit(fn) { snapshot(); fn(); save(); paintAll(); }
function undo() {
  if (!state.undo.length) return;
  state.redo.push(JSON.stringify(state.ann));
  state.ann = JSON.parse(state.undo.pop());
  save(); paintAll(); updateUndoButtons();
}
function redo() {
  if (!state.redo.length) return;
  state.undo.push(JSON.stringify(state.ann));
  state.ann = JSON.parse(state.redo.pop());
  save(); paintAll(); updateUndoButtons();
}
function updateUndoButtons() {
  $('#btn-undo').disabled = !state.undo.length;
  $('#btn-redo').disabled = !state.redo.length;
}

/* ===================== opening documents ===================== */
async function openFile(file) {
  if (!file) return;
  if (!/\.docx$/i.test(file.name)) { toast('Please choose a .docx file (Word 2007 or newer).'); return; }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = hashBytes(bytes);
  const prev = await db.get('files', id);
  await db.put('files', { id, name: file.name, size: bytes.length, bytes, added: prev?.added || Date.now(), updated: Date.now() });
  await loadDoc(id, file.name, bytes);
}

async function openStored(id) {
  const f = await db.get('files', id);
  if (!f) { toast('That document is no longer stored.'); return renderHome(); }
  await loadDoc(id, f.name, f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes));
}

async function loadDoc(id, name, bytes) {
  hidePops();
  state.docId = id; state.name = name; state.bytes = bytes;
  const rec = await db.get('ann', id);
  state.ann = rec?.ann ? Object.assign(emptyAnn(), rec.ann) : emptyAnn();
  state.undo = []; state.redo = []; updateUndoButtons();
  $('#doc-name').textContent = name; $('#doc-name').title = name;
  document.title = name + ' — DOCX Annotator';
  $('#home').hidden = true; $('#viewer').hidden = false;
  document.body.classList.add('has-doc');
  try { localStorage.setItem('lastDoc', id); } catch {}
  try {
    await renderDoc();
  } catch (e) {
    console.error(e);
    toast('Could not read this file — is it a valid .docx?');
    return renderHome();
  }
  $('#viewer').scrollTop = 0;
}

async function renderDoc() {
  const host = $('#doc');
  host.innerHTML = '';
  await docx.renderAsync(state.bytes, host, null, {
    className: 'docx', inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: true,
    experimental: true, renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true,
    useBase64URL: true, renderChanges: false, renderComments: false,
  });
  state.pages = [...host.querySelectorAll('section.docx')];
  state.pageSize = state.pages.map(pg => [pg.offsetWidth, pg.offsetHeight]);
  state.pages.forEach((pg, i) => {
    const ov = document.createElement('div');
    ov.className = 'overlay'; ov.dataset.page = i;
    const [w, h] = state.pageSize[i];
    ov.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"></svg>`;
    pg.appendChild(ov);
    bindOverlay(ov, i);
  });
  let saved = null; try { saved = localStorage.getItem('zoom'); } catch {}
  if (!saved || fitZoom() < state.zoom) state.zoom = fitZoom();
  applyZoom();
  paintAll();
}
function fitZoom() {
  const w = Math.max(...state.pageSize.map(s => s[0]), 1);
  return Math.min(1.5, Math.max(0.3, Math.floor(($('#viewer').clientWidth - 28) / w * 100) / 100));
}

/* ===================== paragraphs & text offsets ===================== */
function paraOf(node) {
  const el = node.nodeType === 3 ? node.parentElement : node;
  const p = el && el.closest('p');
  if (!p || !p.closest('#doc section.docx') || p.closest('header,footer,.overlay')) return null;
  return p;
}
function ownTextNodes(p) {
  const out = [];
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) if (paraOf(n) === p) out.push(n);
  return out;
}
const ownText = p => ownTextNodes(p).map(n => n.data).join('');
function bodyParas() {
  return $$('#doc section.docx p').filter(p => !p.closest('header,footer,.overlay'));
}
function paraIndex() { // [{p, text, key}] with occurrence counters by normalized text
  const counts = new Map();
  return bodyParas().map((p, i) => {
    const text = ownText(p), k = norm(text);
    const occ = counts.get(k) || 0; counts.set(k, occ + 1);
    return { p, text, k, occ, i };
  });
}

function rangeToSegments(range) {
  const idx = paraIndex(), segs = [];
  for (const P of idx) {
    if (!range.intersectsNode(P.p)) continue;
    let off = 0, s = null, e = null;
    for (const n of ownTextNodes(P.p)) {
      const len = n.data.length;
      if (range.intersectsNode(n)) {
        const a = n === range.startContainer ? range.startOffset : 0;
        const b = n === range.endContainer ? range.endOffset : len;
        if (b > a) { if (s === null) s = off + a; e = off + b; }
      }
      off += len;
    }
    if (s !== null && e > s) {
      const text = P.text.slice(s, e);
      if (text.trim()) segs.push({ pi: P.i, pt: P.text, occ: P.occ, start: s, end: e, text });
    }
  }
  return segs;
}

function locate(seg, idx) {
  const k = norm(seg.pt);
  const byText = idx.filter(P => P.k === k);
  if (byText[seg.occ]) return byText[seg.occ];
  if (byText.length) return byText[byText.length - 1];
  const P = idx[seg.pi];
  if (P && norm(P.text.slice(seg.start, seg.end)) === norm(seg.text)) return P;
  return null;
}

function wrapOffsets(p, start, end, make) {
  const marks = [];
  let off = 0;
  for (const n of ownTextNodes(p)) {
    const len = n.data.length, ns = off; off += len;
    if (ns + len <= start || ns >= end) continue;
    let node = n;
    const a = Math.max(start, ns) - ns, b = Math.min(end, ns + len) - ns;
    if (b < len) node.splitText(b);
    if (a > 0) node = node.splitText(a);
    const m = make();
    node.parentNode.insertBefore(m, node);
    m.appendChild(node);
    marks.push(m);
  }
  return marks;
}

/* ===================== painting ===================== */
function paintAll() {
  if (!state.docId) return;
  paintHighlights(); paintInk(); paintTexts(); renderSidebar();
}

function paintHighlights() {
  const touched = new Set();
  $$('#doc mark.hl').forEach(m => {
    const parent = m.parentNode; touched.add(paraOf(m) || parent);
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    m.remove();
  });
  touched.forEach(p => p && p.normalize());
  const idx = paraIndex();
  for (const h of state.ann.highlights) {
    const c = colorById(h.color).css;
    let all = [];
    for (const seg of h.segments) {
      const P = locate(seg, idx);
      if (!P) continue;
      let { start, end } = seg;
      if (P.text.slice(start, end) !== seg.text) { // text moved; try to find it
        const at = P.text.indexOf(seg.text);
        if (at < 0) continue;
        start = at; end = at + seg.text.length;
      }
      all = all.concat(wrapOffsets(P.p, start, end, () => {
        const m = document.createElement('mark');
        m.className = 'hl'; m.dataset.hid = h.id; m.style.background = c;
        return m;
      }));
    }
    if (h.note && all.length) all[all.length - 1].classList.add('has-note');
  }
}

function pathD(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) { const [x, y] = pts[0]; return `M${x} ${y}l0.01 0`; }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    d += `Q${x1} ${y1} ${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2).toFixed(1)}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${l[0]} ${l[1]}`;
}
function strokeEl(s) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', pathD(s.points));
  p.setAttribute('stroke', s.color);
  p.setAttribute('stroke-width', s.size);
  if (s.marker) { p.setAttribute('stroke-opacity', '0.35'); p.style.mixBlendMode = 'multiply'; p.setAttribute('stroke-linecap', 'butt'); }
  p.dataset.sid = s.id;
  return p;
}
function paintInk() {
  $$('#doc .overlay svg').forEach(svg => svg.innerHTML = '');
  for (const s of state.ann.strokes) {
    const svg = state.pages[s.page]?.querySelector('.overlay svg');
    if (svg) svg.appendChild(strokeEl(s));
  }
}

function paintTexts() {
  $$('#doc .tbox').forEach(t => t.remove());
  for (const t of state.ann.texts) {
    const ov = state.pages[t.page]?.querySelector('.overlay');
    if (ov) ov.appendChild(textBoxEl(t));
  }
}

function textBoxEl(t) {
  const box = document.createElement('div');
  box.className = 'tbox'; box.dataset.tid = t.id;
  Object.assign(box.style, { left: t.x + 'px', top: t.y + 'px', color: t.color, fontSize: t.size + 'px' });
  if (t.w) box.style.width = t.w + 'px';
  box.innerHTML = '<span class="tb-handle" title="Drag to move">&#10021; move</span><button class="tb-del" title="Delete text">&times;</button><div class="tb-text" contenteditable="true" spellcheck="true"></div>';
  const ed = box.querySelector('.tb-text');
  ed.textContent = t.text;
  let snapped = false;
  ed.addEventListener('focus', () => { snapped = false; });
  ed.addEventListener('input', () => {
    if (!snapped) { snapshot(); snapped = true; }
    const cur = state.ann.texts.find(x => x.id === t.id);
    if (cur) cur.text = ed.innerText.replace(/\n$/, '');
    save(); renderSidebar();
  });
  ed.addEventListener('blur', () => {
    const cur = state.ann.texts.find(x => x.id === t.id);
    if (cur && !cur.text.trim()) {
      state.ann.texts = state.ann.texts.filter(x => x.id !== t.id);
      box.remove(); save(); renderSidebar();
    }
  });
  ed.addEventListener('pointerdown', e => e.stopPropagation());
  box.querySelector('.tb-del').addEventListener('pointerdown', e => e.stopPropagation());
  box.querySelector('.tb-del').addEventListener('click', e => {
    e.stopPropagation();
    commit(() => { state.ann.texts = state.ann.texts.filter(x => x.id !== t.id); });
  });
  const handle = box.querySelector('.tb-handle');
  handle.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    const ov = box.parentElement, page = +ov.dataset.page;
    const start = toPage(ov, page, e), ox = t.x, oy = t.y;
    let moved = false;
    const move = ev => {
      const p = toPage(ov, page, ev);
      if (!moved) { snapshot(); moved = true; }
      const cur = state.ann.texts.find(x => x.id === t.id);
      if (!cur) return;
      cur.x = Math.round(ox + p[0] - start[0]); cur.y = Math.round(oy + p[1] - start[1]);
      box.style.left = cur.x + 'px'; box.style.top = cur.y + 'px';
    };
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); if (moved) save(); };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
  return box;
}

/* ===================== ink & text overlay input ===================== */
function toPage(ov, page, e) {
  const r = ov.getBoundingClientRect(), [w, h] = state.pageSize[page];
  return [+((e.clientX - r.left) * w / r.width).toFixed(1), +((e.clientY - r.top) * h / r.height).toFixed(1)];
}

function bindOverlay(ov, page) {
  const svg = ov.querySelector('svg');
  let cur = null, el = null, erasing = false, erasedSnap = false;

  ov.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const tool = state.tool;
    if (tool === 'pen' || tool === 'marker') {
      e.preventDefault();
      ov.setPointerCapture(e.pointerId);
      const marker = tool === 'marker';
      cur = { id: uid(), page, color: state.penColor, size: marker ? state.penSize * 4 + 8 : state.penSize, marker, points: [toPage(ov, page, e)] };
      el = strokeEl(cur); svg.appendChild(el);
    } else if (tool === 'eraser') {
      e.preventDefault(); ov.setPointerCapture(e.pointerId);
      erasing = true; erasedSnap = false; eraseAt(toPage(ov, page, e));
    } else if (tool === 'text') {
      if (closest(e.target, '.tbox')) return;
      e.preventDefault();
      const [x, y] = toPage(ov, page, e);
      const size = 10 + state.penSize * 2;
      const t = { id: uid(), page, x: Math.round(x), y: Math.round(y - size * 0.7), text: '', color: state.penColor, size };
      snapshot();
      state.ann.texts.push(t);
      const box = textBoxEl(t); ov.appendChild(box);
      setTimeout(() => box.querySelector('.tb-text').focus(), 0);
    }
  });
  ov.addEventListener('pointermove', e => {
    if (cur) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const p = toPage(ov, page, ev), l = cur.points[cur.points.length - 1];
        if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 1.2) cur.points.push(p);
      }
      el.setAttribute('d', pathD(cur.points));
    } else if (erasing) eraseAt(toPage(ov, page, e));
  });
  const end = () => {
    if (cur) {
      const s = cur; cur = null; el = null;
      commit(() => state.ann.strokes.push(s));
    }
    if (erasing) { erasing = false; if (erasedSnap) save(); }
  };
  ov.addEventListener('pointerup', end);
  ov.addEventListener('pointercancel', end);

  function eraseAt([x, y]) {
    const r = 8 + state.penSize;
    const hit = state.ann.strokes.filter(s => s.page === page && s.points.some(([px, py], i, a) => {
      if (Math.hypot(px - x, py - y) <= r + s.size / 2) return true;
      const q = a[i + 1]; if (!q) return false;
      return distSeg(x, y, px, py, q[0], q[1]) <= r + s.size / 2;
    }));
    if (!hit.length) return;
    if (!erasedSnap) { snapshot(); erasedSnap = true; }
    const ids = new Set(hit.map(s => s.id));
    state.ann.strokes = state.ann.strokes.filter(s => !ids.has(s.id));
    ids.forEach(id => svg.querySelector(`[data-sid="${id}"]`)?.remove());
    renderSidebar();
  }
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/* ===================== text selection → highlights ===================== */
function currentDocRange() {
  const sel = getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  if (!$('#doc').contains(r.commonAncestorContainer)) return null;
  return r;
}
function addHighlight(range, color, withNote) {
  const segs = rangeToSegments(range);
  if (!segs.length) return null;
  const h = { id: uid(), color, note: '', created: Date.now(), segments: segs };
  commit(() => state.ann.highlights.push(h));
  getSelection().removeAllRanges();
  hidePops();
  if (withNote) openNote(h.id);
  return h;
}

function placePop(pop, rect) {
  pop.hidden = false;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = rect.left + rect.width / 2 - pw / 2, y = rect.top - ph - 8;
  if (y < 60) y = rect.bottom + 8;
  x = Math.max(8, Math.min(innerWidth - pw - 8, x));
  y = Math.min(innerHeight - ph - 8, y);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}
function hidePops() { $('#sel-pop').hidden = true; $('#hl-pop').hidden = true; }

let selTimer;
document.addEventListener('selectionchange', () => {
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    if (state.tool !== 'select') return;
    const r = currentDocRange();
    if (!r || !rangeToSegments(r).length) { $('#sel-pop').hidden = true; return; }
    $('#hl-pop').hidden = true;
    placePop($('#sel-pop'), r.getBoundingClientRect());
  }, 250);
});

document.addEventListener('pointerup', e => {
  if (state.tool !== 'highlight' || !state.docId) return;
  if (closest(e.target, '#toolbar,.pop,#sidebar')) return;
  setTimeout(() => {
    const r = currentDocRange();
    if (r) addHighlight(r, state.color, false);
  }, 10);
});

$('#doc').addEventListener('click', e => {
  const m = closest(e.target, 'mark.hl');
  if (!m || (state.tool !== 'select' && state.tool !== 'highlight')) return;
  if (!getSelection().isCollapsed) return;
  showHlPop(m.dataset.hid, m);
});

function showHlPop(hid, anchorEl) {
  const pop = $('#hl-pop'); pop.dataset.hid = hid;
  const h = state.ann.highlights.find(x => x.id === hid);
  pop.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', h && s.dataset.color === h.color));
  $('#sel-pop').hidden = true;
  placePop(pop, anchorEl.getBoundingClientRect());
}

function buildSwatches(container, onPick) {
  container.innerHTML = '';
  for (const c of HL_COLORS) {
    const b = document.createElement('button');
    b.className = 'swatch'; b.style.background = c.css; b.dataset.color = c.id;
    b.title = c.id[0].toUpperCase() + c.id.slice(1); b.setAttribute('aria-label', b.title + ' highlight');
    b.addEventListener('mousedown', e => e.preventDefault()); // keep text selection
    b.addEventListener('click', () => onPick(c.id));
    container.appendChild(b);
  }
}

/* ===================== sidebar ===================== */
function snippet(h) { return h.segments.map(s => s.text).join(' … '); }
function renderSidebar() {
  const list = $('#side-list');
  const hs = state.ann.highlights, ts = state.ann.texts.filter(t => t.text.trim());
  $('#note-count').textContent = hs.length + ts.length;
  if (document.activeElement && list.contains(document.activeElement)) return; // don't disrupt typing
  list.innerHTML = '';
  if (!hs.length && !ts.length && !state.ann.strokes.length) {
    list.innerHTML = '<div class="empty">No annotations yet.<br><br>Select text to highlight it, or pick the Pen / Text tool to write on the page.</div>';
    return;
  }
  const order = paraOrder();
  const items = hs.slice().sort((a, b) => (order(a) - order(b)) || (a.segments[0].start - b.segments[0].start));
  for (const h of items) {
    const card = document.createElement('div');
    card.className = 'card'; card.style.borderLeftColor = colorById(h.color).css; card.dataset.hid = h.id;
    card.innerHTML = '<div class="quote"></div><textarea placeholder="Add a note…"></textarea><div class="row"><small></small><button class="danger">Delete</button></div>';
    card.querySelector('.quote').textContent = '“' + snippet(h) + '”';
    card.querySelector('small').textContent = new Date(h.created).toLocaleDateString();
    const ta = card.querySelector('textarea'); ta.value = h.note || '';
    let snapped = false;
    ta.addEventListener('focus', () => { snapped = false; });
    ta.addEventListener('input', () => {
      if (!snapped) { snapshot(); snapped = true; }
      h.note = ta.value; save();
      $$(`#doc mark.hl[data-hid="${h.id}"]`).forEach((m, i, a) => m.classList.toggle('has-note', !!h.note && i === a.length - 1));
    });
    ta.addEventListener('blur', () => renderSidebar());
    card.querySelector('.quote').addEventListener('click', () => scrollToHl(h.id));
    card.querySelector('.danger').addEventListener('click', () => commit(() => {
      state.ann.highlights = state.ann.highlights.filter(x => x.id !== h.id);
    }));
    list.appendChild(card);
  }
  for (const t of ts) {
    const card = document.createElement('div');
    card.className = 'card'; card.style.borderLeftColor = t.color;
    card.innerHTML = '<div class="quote"></div><div class="row"><small></small><button class="danger">Delete</button></div>';
    card.querySelector('.quote').textContent = '✎ ' + t.text;
    card.querySelector('small').textContent = 'Text on page ' + (t.page + 1);
    card.querySelector('.quote').addEventListener('click', () => {
      const b = $(`#doc .tbox[data-tid="${t.id}"]`);
      if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.querySelector('.tb-text').focus(); }
    });
    card.querySelector('.danger').addEventListener('click', () => commit(() => {
      state.ann.texts = state.ann.texts.filter(x => x.id !== t.id);
    }));
    list.appendChild(card);
  }
  if (state.ann.strokes.length) {
    const card = document.createElement('div');
    card.className = 'card'; card.style.borderLeftColor = state.penColor;
    card.innerHTML = `<div>${state.ann.strokes.length} ink stroke(s)</div><div class="row"><small>Use the eraser to remove single strokes</small><button class="danger">Clear all ink</button></div>`;
    card.querySelector('.danger').addEventListener('click', () => {
      if (confirm('Remove all pen and marker ink from this document?')) commit(() => { state.ann.strokes = []; });
    });
    list.appendChild(card);
  }
}
function paraOrder() {
  const idx = paraIndex();
  return h => { const P = locate(h.segments[0], idx); return P ? P.i : 1e9; };
}
function scrollToHl(hid) {
  const m = $(`#doc mark.hl[data-hid="${hid}"]`);
  if (!m) { toast('Could not find that text in the document.'); return; }
  m.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const ms = $$(`#doc mark.hl[data-hid="${hid}"]`);
  ms.forEach(x => x.classList.add('flash'));
  setTimeout(() => ms.forEach(x => x.classList.remove('flash')), 1200);
}
function openNote(hid) {
  setSidebar(true);
  renderSidebar();
  const card = $(`#side-list .card[data-hid="${hid}"]`);
  if (card) { card.scrollIntoView({ block: 'nearest' }); card.querySelector('textarea').focus(); }
}
function setSidebar(show) {
  $('#sidebar').hidden = !show;
  try { localStorage.setItem('sidebar', show ? '1' : '0'); } catch {}
}

/* ===================== tools, zoom ===================== */
function setTool(t) {
  state.tool = t;
  $$('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  const d = $('#doc'); d.className = 'tool-' + t;
  hidePops();
  if (t === 'highlight') { const r = currentDocRange(); if (r) addHighlight(r, state.color, false); }
}
function setColor(c) {
  state.color = c;
  $$('#hl-colors .swatch').forEach(s => s.classList.toggle('active', s.dataset.color === c));
  try { localStorage.setItem('hlColor', c); } catch {}
}
function applyZoom() {
  const w = $('#doc .docx-wrapper');
  if (w) w.style.zoom = state.zoom;
  $('#zoom-label').textContent = Math.round(state.zoom * 100) + '%';
}
function zoomBy(f) {
  state.zoom = Math.min(3, Math.max(0.3, Math.round(state.zoom * f * 20) / 20));
  applyZoom();
  try { localStorage.setItem('zoom', state.zoom); } catch {}
}

/* ===================== export: annotated .docx ===================== */
function wEl(doc, name) { return doc.createElementNS(W_NS, 'w:' + name); }
function wAttr(el, name, val) { el.setAttributeNS(W_NS, 'w:' + name, val); }
function isW(el, name) { return el && el.nodeType === 1 && el.namespaceURI === W_NS && el.localName === name; }
function nearestP(el) {
  for (let n = el.parentNode; n; n = n.parentNode) if (isW(n, 'p')) return n;
  return null;
}
function inFallback(el) {
  for (let n = el.parentNode; n; n = n.parentNode) if (n.namespaceURI === MC_NS && n.localName === 'Fallback') return true;
  return false;
}
function ownRuns(p) { return [...p.getElementsByTagNameNS(W_NS, 'r')].filter(r => nearestP(r) === p); }
function childLen(c) {
  if (isW(c, 't')) return c.textContent.length;
  if (isW(c, 'tab') || isW(c, 'noBreakHyphen') || isW(c, 'sym')) return 1;
  return 0;
}
function childText(c) {
  if (isW(c, 't')) return c.textContent;
  if (isW(c, 'tab')) return '\t';
  if (isW(c, 'noBreakHyphen')) return '-';
  if (isW(c, 'sym')) return '?';
  return '';
}
const contentKids = r => [...r.childNodes].filter(c => c.nodeType === 1 && !isW(c, 'rPr'));
const runLen = r => contentKids(r).reduce((s, c) => s + childLen(c), 0);
const runText = r => contentKids(r).map(childText).join('');
const xmlParaText = p => ownRuns(p).map(runText).join('');

function cloneRunWith(r, child) {
  const n = r.cloneNode(false);
  const rPr = [...r.childNodes].find(c => isW(c, 'rPr'));
  if (rPr) n.appendChild(rPr.cloneNode(true));
  n.appendChild(child);
  return n;
}
function explodeRun(r) {
  const kids = contentKids(r);
  if (kids.length <= 1) return [r];
  const out = kids.map(k => cloneRunWith(r, k));
  out.forEach(n => r.parentNode.insertBefore(n, r));
  r.remove();
  return out;
}
function splitTextRun(r, a, b) {
  const t = contentKids(r)[0], txt = t.textContent, doc = r.ownerDocument;
  const parts = [[0, a], [a, b], [b, txt.length]];
  let middle = null;
  for (const [x, y] of parts) {
    if (y <= x) continue;
    const nt = wEl(doc, 't');
    nt.setAttributeNS(XML_NS, 'xml:space', 'preserve');
    nt.textContent = txt.slice(x, y);
    const nr = cloneRunWith(r, nt);
    r.parentNode.insertBefore(nr, r);
    if (x === a) middle = nr;
  }
  r.remove();
  return middle;
}
const RPR_AFTER_HIGHLIGHT = new Set(['u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath', 'rPrChange']);
function setHighlight(r, word) {
  const doc = r.ownerDocument;
  let rPr = [...r.childNodes].find(c => isW(c, 'rPr'));
  if (!rPr) { rPr = wEl(doc, 'rPr'); r.insertBefore(rPr, r.firstChild); }
  [...rPr.childNodes].filter(c => isW(c, 'highlight')).forEach(c => c.remove());
  const hl = wEl(doc, 'highlight'); wAttr(hl, 'val', word);
  const before = [...rPr.childNodes].find(c => c.nodeType === 1 && c.namespaceURI === W_NS && RPR_AFTER_HIGHLIGHT.has(c.localName));
  rPr.insertBefore(hl, before || null);
}
function markXmlPara(p, s, e, word) {
  let off = 0; const hits = [];
  for (const r0 of ownRuns(p)) {
    const len0 = runLen(r0);
    if (!len0 || off + len0 <= s || off >= e) { off += len0; continue; }
    for (const r of explodeRun(r0)) {
      const len = runLen(r), rs = off; off += len;
      if (!len || rs + len <= s || rs >= e) continue;
      const a = Math.max(s, rs) - rs, b = Math.min(e, rs + len) - rs;
      let target = r;
      if ((a > 0 || b < len) && isW(contentKids(r)[0], 't')) target = splitTextRun(r, a, b);
      setHighlight(target, word);
      hits.push(target);
    }
  }
  return hits;
}

async function exportDocx() {
  if (!state.bytes) return;
  const zip = await JSZip.loadAsync(state.bytes);
  const docPath = await mainDocPath(zip);
  const parser = new DOMParser(), ser = new XMLSerializer();
  const doc = parser.parseFromString(await zip.file(docPath).async('string'), 'application/xml');
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  const xps = [...body.getElementsByTagNameNS(W_NS, 'p')].filter(p => !inFallback(p));
  const xidx = []; const counts = new Map();
  xps.forEach((p, i) => {
    const text = xmlParaText(p), k = norm(text);
    const occ = counts.get(k) || 0; counts.set(k, occ + 1);
    xidx.push({ p, text, k, occ, i });
  });

  const comments = [];
  let missed = 0;
  for (const h of state.ann.highlights) {
    const word = colorById(h.color).word;
    let hits = [];
    for (const seg of h.segments) {
      const k = norm(seg.pt), segK = norm(seg.text);
      let P = xidx.filter(x => x.k === k)[seg.occ] || xidx.find(x => x.k === k);
      let s = seg.start, e = seg.end;
      if (!P || norm(P.text.slice(s, e)) !== segK) {
        P = xidx.find(x => x.k.includes(segK));
        if (P) { s = P.k.indexOf(segK); e = s + segK.length; }
      }
      if (!P) { missed++; continue; }
      hits = hits.concat(markXmlPara(P.p, s, e, word));
      P.text = xmlParaText(P.p); // unchanged text, but keep model fresh
    }
    if (h.note && h.note.trim() && hits.length) comments.push({ h, first: hits[0], last: hits[hits.length - 1] });
  }

  if (comments.length) await addComments(zip, doc, docPath, comments);

  zip.file(docPath, withDecl(ser.serializeToString(doc)));
  const blob = await zip.generateAsync({
    type: 'blob', compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  download(blob, state.name.replace(/\.docx$/i, '') + ' (annotated).docx');
  let msg = 'Saved annotated .docx';
  if (missed) msg += ` — ${missed} highlight part(s) could not be matched`;
  if (state.ann.strokes.length || state.ann.texts.length) msg += '. Ink & text boxes are kept in the app and in Print/PDF.';
  toast(msg, 5000);
}

const withDecl = s => s.startsWith('<?xml') ? s : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s;

async function mainDocPath(zip) {
  try {
    const rels = new DOMParser().parseFromString(await zip.file('_rels/.rels').async('string'), 'application/xml');
    const r = [...rels.getElementsByTagName('Relationship')].find(x => /\/officeDocument$/.test(x.getAttribute('Type')));
    if (r) return r.getAttribute('Target').replace(/^\//, '');
  } catch {}
  return 'word/document.xml';
}

async function addComments(zip, doc, docPath, list) {
  const parser = new DOMParser(), ser = new XMLSerializer();
  const dir = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/') + 1) : '';
  const relsPath = dir + '_rels/' + docPath.slice(dir.length) + '.rels';
  const relsXml = zip.file(relsPath) ? await zip.file(relsPath).async('string')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const rels = parser.parseFromString(relsXml, 'application/xml');
  const RELNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const relEls = [...rels.getElementsByTagNameNS(RELNS, 'Relationship')];
  let crel = relEls.find(x => /\/comments$/.test(x.getAttribute('Type')));
  let target = 'comments.xml';
  if (crel) target = crel.getAttribute('Target').replace(/^\//, '');
  else {
    const ids = new Set(relEls.map(x => x.getAttribute('Id')));
    let n = 1; while (ids.has('rIdAnn' + n)) n++;
    crel = rels.createElementNS(RELNS, 'Relationship');
    crel.setAttribute('Id', 'rIdAnn' + n);
    crel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments');
    crel.setAttribute('Target', target);
    rels.documentElement.appendChild(crel);
    zip.file(relsPath, withDecl(ser.serializeToString(rels)));
  }
  const cPath = target.startsWith('word/') || !dir ? target : dir + target;

  let cdoc;
  if (zip.file(cPath)) cdoc = parser.parseFromString(await zip.file(cPath).async('string'), 'application/xml');
  else cdoc = parser.parseFromString(`<w:comments xmlns:w="${W_NS}"></w:comments>`, 'application/xml');
  let nextId = 0;
  for (const c of cdoc.getElementsByTagNameNS(W_NS, 'comment')) nextId = Math.max(nextId, (+c.getAttributeNS(W_NS, 'id') || 0) + 1);
  for (const c of doc.getElementsByTagNameNS(W_NS, 'commentReference')) nextId = Math.max(nextId, (+c.getAttributeNS(W_NS, 'id') || 0) + 1);

  const author = getAuthor();
  for (const { h, first, last } of list) {
    const id = String(nextId++);
    const cm = cdoc.createElementNS(W_NS, 'w:comment');
    cm.setAttributeNS(W_NS, 'w:id', id);
    cm.setAttributeNS(W_NS, 'w:author', author);
    cm.setAttributeNS(W_NS, 'w:initials', author.split(/\s+/).map(x => x[0] || '').join('').slice(0, 3).toUpperCase() || 'A');
    cm.setAttributeNS(W_NS, 'w:date', new Date(h.created).toISOString().replace(/\.\d+Z$/, 'Z'));
    for (const line of h.note.split('\n')) {
      const p = cdoc.createElementNS(W_NS, 'w:p'), r = cdoc.createElementNS(W_NS, 'w:r'), t = cdoc.createElementNS(W_NS, 'w:t');
      t.setAttributeNS(XML_NS, 'xml:space', 'preserve'); t.textContent = line;
      r.appendChild(t); p.appendChild(r); cm.appendChild(p);
    }
    cdoc.documentElement.appendChild(cm);

    const rs = wEl(doc, 'commentRangeStart'); wAttr(rs, 'id', id);
    first.parentNode.insertBefore(rs, first);
    const re = wEl(doc, 'commentRangeEnd'); wAttr(re, 'id', id);
    last.parentNode.insertBefore(re, last.nextSibling);
    const rr = wEl(doc, 'r'), ref = wEl(doc, 'commentReference'); wAttr(ref, 'id', id);
    rr.appendChild(ref);
    re.parentNode.insertBefore(rr, re.nextSibling);
  }
  zip.file(cPath, withDecl(ser.serializeToString(cdoc)));

  const ctPath = '[Content_Types].xml';
  const ct = parser.parseFromString(await zip.file(ctPath).async('string'), 'application/xml');
  const part = '/' + cPath;
  const CTNS = ct.documentElement.namespaceURI;
  if (![...ct.getElementsByTagNameNS(CTNS, 'Override')].some(o => o.getAttribute('PartName') === part)) {
    const o = ct.createElementNS(CTNS, 'Override');
    o.setAttribute('PartName', part);
    o.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml');
    ct.documentElement.appendChild(o);
    zip.file(ctPath, withDecl(ser.serializeToString(ct)));
  }
}
function getAuthor() {
  let a = '';
  try { a = localStorage.getItem('author') || ''; } catch {}
  return a || 'DOCX Annotator';
}

/* ===================== export: json backup ===================== */
function exportJson() {
  const data = { app: 'docx-annotator', name: state.name, docId: state.docId, exported: new Date().toISOString(), annotations: state.ann };
  download(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), state.name.replace(/\.docx$/i, '') + '.annotations.json');
}
async function importJson(file) {
  try {
    const data = JSON.parse(await file.text());
    const ann = data.annotations || data;
    if (!Array.isArray(ann.highlights)) throw new Error('bad file');
    if (data.docId && data.docId !== state.docId && !confirm('This backup was made for a different version of the document (“' + (data.name || '?') + '”). Load it anyway?')) return;
    commit(() => { state.ann = Object.assign(emptyAnn(), ann); });
    toast('Annotations restored');
  } catch { toast('That is not a valid annotations backup.'); }
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ===================== home screen ===================== */
async function renderHome() {
  state.docId = null; state.bytes = null;
  document.body.classList.remove('has-doc');
  document.title = 'DOCX Annotator';
  $('#doc').innerHTML = '';
  $('#viewer').hidden = true; $('#sidebar').hidden = true; $('#home').hidden = false;
  $('#doc-name').textContent = '';
  hidePops();
  const files = (await db.all('files')).sort((a, b) => b.updated - a.updated);
  const ul = $('#recent'); ul.innerHTML = '';
  $('#recent-wrap').hidden = !files.length;
  for (const f of files) {
    const li = document.createElement('li');
    li.innerHTML = '<button class="open"><b></b><small></small></button><button class="icon danger" title="Remove from this device">&#128465;</button>';
    li.querySelector('b').textContent = f.name;
    li.querySelector('small').textContent = `${(f.size / 1024).toFixed(0)} KB · last opened ${new Date(f.updated).toLocaleString()}`;
    li.querySelector('.open').addEventListener('click', () => openStored(f.id));
    li.querySelector('.danger').addEventListener('click', async () => {
      if (!confirm(`Remove “${f.name}” and its annotations from this device?`)) return;
      await db.del('files', f.id); await db.del('ann', f.id); renderHome();
    });
    ul.appendChild(li);
  }
}

function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ===================== wiring ===================== */
function init() {
  try {
    state.color = localStorage.getItem('hlColor') || 'yellow';
    state.penColor = localStorage.getItem('penColor') || state.penColor;
    state.penSize = +localStorage.getItem('penSize') || state.penSize;
    state.zoom = +localStorage.getItem('zoom') || 1;
  } catch {}
  $('#pen-color').value = state.penColor; $('#pen-size').value = state.penSize;

  buildSwatches($('#hl-colors'), c => { setColor(c); if (state.tool !== 'highlight') setTool('highlight'); });
  setColor(state.color);
  buildSwatches($('#sel-pop .swatches'), c => { const r = currentDocRange(); if (r) { setColor(c); addHighlight(r, c, false); } });
  buildSwatches($('#hl-pop .swatches'), c => {
    const hid = $('#hl-pop').dataset.hid;
    commit(() => { const h = state.ann.highlights.find(x => x.id === hid); if (h) h.color = c; });
    setColor(c); hidePops();
  });
  $('#sel-pop [data-act=note]').addEventListener('mousedown', e => e.preventDefault());
  $('#sel-pop [data-act=note]').addEventListener('click', () => { const r = currentDocRange(); if (r) addHighlight(r, state.color, true); });
  $('#hl-pop [data-act=note]').addEventListener('click', () => { const hid = $('#hl-pop').dataset.hid; hidePops(); openNote(hid); });
  $('#hl-pop [data-act=delete]').addEventListener('click', () => {
    const hid = $('#hl-pop').dataset.hid; hidePops();
    commit(() => { state.ann.highlights = state.ann.highlights.filter(x => x.id !== hid); });
  });

  $$('.tool').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  setTool('select');
  $('#pen-color').addEventListener('input', e => { state.penColor = e.target.value; try { localStorage.setItem('penColor', state.penColor); } catch {} });
  $('#pen-size').addEventListener('input', e => { state.penSize = +e.target.value; try { localStorage.setItem('penSize', state.penSize); } catch {} });
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);
  $('#btn-zoom-in').addEventListener('click', () => zoomBy(1.15));
  $('#btn-zoom-out').addEventListener('click', () => zoomBy(1 / 1.15));
  $('#zoom-label').addEventListener('click', () => { state.zoom = fitZoom(); applyZoom(); try { localStorage.setItem('zoom', state.zoom); } catch {} });
  $('#btn-sidebar').addEventListener('click', () => { setSidebar($('#sidebar').hidden); renderSidebar(); });
  $('#btn-close-side').addEventListener('click', () => setSidebar(false));
  $('#btn-home').addEventListener('click', renderHome);
  updateUndoButtons();

  const onFile = e => { openFile(e.target.files[0]).then(() => setSidebarFromPref()); e.target.value = ''; };
  $('#file-input').addEventListener('change', onFile);
  $('#file-input-2').addEventListener('change', onFile);

  const menu = $('#export-menu');
  $('#btn-export').addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener('click', e => { if (!closest(e.target, '.menu')) menu.hidden = true; });
  menu.addEventListener('click', e => {
    const b = closest(e.target, 'button'); if (!b) return;
    menu.hidden = true;
    const act = b.dataset.act;
    if (act === 'docx') exportDocx().catch(err => { console.error(err); toast('Export failed: ' + err.message); });
    if (act === 'print') { hidePops(); setTimeout(() => print(), 50); }
    if (act === 'json') exportJson();
    if (act === 'import') $('#json-input').click();
  });
  $('#json-input').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });

  // hide popovers when clicking elsewhere / scrolling
  document.addEventListener('pointerdown', e => { if (!closest(e.target, '.pop') && !closest(e.target, 'mark.hl')) $('#hl-pop').hidden = true; });
  $('#viewer').addEventListener('scroll', () => hidePops(), { passive: true });

  // drag & drop anywhere
  let dragDepth = 0;
  addEventListener('dragenter', e => { if (e.dataTransfer?.types?.includes('Files')) { dragDepth++; $('#drop-overlay').hidden = false; } });
  addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#drop-overlay').hidden = true; } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => {
    e.preventDefault(); dragDepth = 0; $('#drop-overlay').hidden = true;
    const f = [...(e.dataTransfer?.files || [])].find(x => /\.docx$/i.test(x.name));
    if (f) openFile(f).then(() => setSidebarFromPref()); else toast('Drop a .docx file');
  });

  // keyboard shortcuts
  addEventListener('keydown', e => {
    const typing = closest(e.target, 'input,textarea,[contenteditable="true"]');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#file-input').click(); return; }
    if (!state.docId) return;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); exportDocx(); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod) return;
    const map = { v: 'select', h: 'highlight', p: 'pen', m: 'marker', t: 'text', e: 'eraser' };
    if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
    if (e.key === 'Escape') { hidePops(); getSelection().removeAllRanges(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !$('#hl-pop').hidden) $('#hl-pop [data-act=delete]').click();
  });

  // Open files passed by the OS when installed as an app (File Handling API)
  if ('launchQueue' in window) {
    launchQueue.setConsumer(async p => { if (p.files?.length) { await openFile(await p.files[0].getFile()); setSidebarFromPref(); } });
  }

  // offline support
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  let deferred;
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    const h = $('#install-hint');
    h.innerHTML = '<button class="primary">Install as an app</button>';
    h.querySelector('button').onclick = () => { deferred.prompt(); h.textContent = ''; };
  });

  renderHome().then(async () => {
    let last; try { last = localStorage.getItem('lastDoc'); } catch {}
    if (last && await db.get('files', last)) { await openStored(last); setSidebarFromPref(); }
  });
}
function setSidebarFromPref() {
  let v = null; try { v = localStorage.getItem('sidebar'); } catch {}
  setSidebar(v === null ? innerWidth > 900 : v === '1');
  renderSidebar();
}

init();
